// /api/withdraw-request.js
// Affiliate নিজের ব্যালেন্সের মধ্যে যেকোনো পরিমাণ withdraw রিকোয়েস্ট পাঠাতে পারবে।
// পেমেন্ট মাধ্যম (bKash/Nagad/Rocket) ও নাম্বার প্রোফাইলে সেভ থাকে — রিকোয়েস্টের সময়
// সেটাই ব্যবহার হয়, চাইলে সেই সময় বদলেও দেওয়া যায়।
// লগইন: সাইটের Google/ইমেইল অ্যাকাউন্টের token, অথবা ref code + পাসওয়ার্ড।

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'hvb_static_salt_2026').digest('hex');
}

const ALLOWED_METHODS = ['bKash', 'Nagad', 'Rocket'];

async function emailFromToken(token) {
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user || !data.user.email) return null;
    return String(data.user.email).trim().toLowerCase();
  } catch (err) {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refCode, password, amount, method, account, token } = req.body || {};

    let affiliate = null;
    const email = await emailFromToken(token);

    if (email) {
      const { data: rows } = await supabase.from('affiliates').select('*').ilike('email', email).limit(1);
      if (rows && rows.length) affiliate = rows[0];
      if (!affiliate) return res.status(404).json({ error: 'এই অ্যাকাউন্টে অ্যাফিলিয়েট খোলা হয়নি' });
    } else {
      if (!refCode || !password) return res.status(400).json({ error: 'আগে লগইন করুন' });
      const cleanRef = String(refCode).trim().toLowerCase();
      const { data: aff } = await supabase.from('affiliates').select('*').eq('ref_code', cleanRef).single();
      if (!aff) return res.status(404).json({ error: 'এই ref code খুঁজে পাওয়া যায়নি' });
      if (aff.password_hash !== hashPassword(password)) return res.status(401).json({ error: 'পাসওয়ার্ড ভুল' });
      affiliate = aff;
    }

    const cleanRef = affiliate.ref_code;

    // মাধ্যম ও নাম্বার — রিকোয়েস্টে দেওয়া না থাকলে প্রোফাইলে সেভ করা তথ্য
    const rawMethod = method || affiliate.pay_method || '';
    const rawAccount = account || affiliate.pay_account || '';
    const cleanMethod = ALLOWED_METHODS.find((m) => m.toLowerCase() === String(rawMethod).trim().toLowerCase());
    if (!cleanMethod) {
      return res.status(400).json({ error: 'আগে ড্যাশবোর্ডে bKash / Nagad / Rocket নাম্বার যোগ করুন' });
    }
    const cleanAccount = String(rawAccount).replace(/[^0-9]/g, '');
    if (!/^01[3-9][0-9]{8}$/.test(cleanAccount)) {
      return res.status(400).json({ error: 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 01712345678)' });
    }

    // নতুন নাম্বার দিলে প্রোফাইলেও সেভ করে রাখা
    if (cleanMethod !== affiliate.pay_method || cleanAccount !== affiliate.pay_account) {
      try {
        await supabase.from('affiliates').update({ pay_method: cleanMethod, pay_account: cleanAccount }).eq('ref_code', cleanRef);
      } catch (e) {}
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('amount')
      .eq('affiliate_ref', cleanRef)
      .eq('status', 'paid');

    const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommission = Math.round(totalSales * affiliate.commission_percent / 100);
    const paidOut = Number(affiliate.paid_out || 0);

    const { data: adjs } = await supabase
      .from('affiliate_adjustments')
      .select('amount')
      .eq('ref_code', cleanRef);
    const adjust = (adjs || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const pending = totalCommission + adjust - paidOut;

    const { data: openReqs } = await supabase
      .from('withdraw_requests')
      .select('amount')
      .eq('ref_code', cleanRef)
      .eq('status', 'pending');
    const held = (openReqs || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const available = pending - held;

    let minWithdraw = 500;
    try {
      const { data: setRow } = await supabase.from('settings').select('value').eq('key', 'min_withdraw').maybeSingle();
      if (setRow && setRow.value) minWithdraw = Number(setRow.value) || 500;
    } catch (err) {}

    const reqAmount = Math.round(Number(amount));
    if (!reqAmount || reqAmount <= 0) {
      return res.status(400).json({ error: 'কত টাকা তুলবেন সেটা লিখুন' });
    }
    if (reqAmount < minWithdraw) {
      return res.status(400).json({ error: 'সর্বনিম্ন ' + minWithdraw + ' ৳ থেকে Withdraw রিকোয়েস্ট পাঠানো যাবে।' });
    }
    if (reqAmount > available) {
      return res.status(400).json({ error: 'আপনার ব্যালেন্সে আছে ' + available + ' ৳ — এর বেশি তোলা যাবে না।' });
    }

    const baseRow = {
      ref_code: cleanRef,
      name: affiliate.name,
      contact: cleanMethod + ' - ' + cleanAccount,
      amount: reqAmount,
      status: 'pending',
    };

    let { error: insertErr } = await supabase
      .from('withdraw_requests')
      .insert(Object.assign({}, baseRow, { method: cleanMethod, account: cleanAccount }));

    if (insertErr) {
      const retry = await supabase.from('withdraw_requests').insert(baseRow);
      insertErr = retry.error;
    }

    if (insertErr) {
      return res.status(500).json({ error: 'সমস্যা হয়েছে: ' + insertErr.message });
    }

    return res.status(200).json({ amount: reqAmount, method: cleanMethod, account: cleanAccount, available: available - reqAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
