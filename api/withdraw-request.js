// /api/withdraw-request.js
// Affiliate নিজের ব্যালেন্সের মধ্যে যেকোনো পরিমাণ withdraw রিকোয়েস্ট পাঠাতে পারবে
// (সর্বনিম্ন সীমা অ্যাডমিন সেটিংস থেকে আসে), সাথে bKash/Nagad/Rocket নাম্বার দিতে হবে।

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refCode, password, amount, method, account } = req.body || {};
    if (!refCode || !password) {
      return res.status(400).json({ error: 'ref code ও পাসওয়ার্ড দিন' });
    }

    const cleanRef = String(refCode).trim().toLowerCase();

    const { data: affiliate, error: affErr } = await supabase
      .from('affiliates')
      .select('*')
      .eq('ref_code', cleanRef)
      .single();

    if (affErr || !affiliate) {
      return res.status(404).json({ error: 'এই ref code খুঁজে পাওয়া যায়নি' });
    }
    if (affiliate.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'পাসওয়ার্ড ভুল' });
    }

    // পেমেন্ট মাধ্যম ও নাম্বার যাচাই
    const cleanMethod = ALLOWED_METHODS.find((m) => m.toLowerCase() === String(method || '').trim().toLowerCase());
    if (!cleanMethod) {
      return res.status(400).json({ error: 'bKash / Nagad / Rocket — যেকোনো একটি বেছে নিন' });
    }
    const cleanAccount = String(account || '').replace(/[^0-9]/g, '');
    if (!/^01[3-9][0-9]{8}$/.test(cleanAccount)) {
      return res.status(400).json({ error: 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 01712345678)' });
    }

    // পাওনা হিসাব করা
    const { data: orders } = await supabase
      .from('orders')
      .select('amount')
      .eq('affiliate_ref', cleanRef)
      .eq('status', 'paid');

    const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommission = Math.round(totalSales * affiliate.commission_percent / 100);
    const paidOut = Number(affiliate.paid_out || 0);

    // অ্যাডমিন থেকে যোগ/কমানো টাকা
    const { data: adjs } = await supabase
      .from('affiliate_adjustments')
      .select('amount')
      .eq('ref_code', cleanRef);
    const adjust = (adjs || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const pending = totalCommission + adjust - paidOut;

    // আগের pending রিকোয়েস্টের টাকা বাদ দিয়ে বাকি ব্যালেন্স
    const { data: openReqs } = await supabase
      .from('withdraw_requests')
      .select('amount')
      .eq('ref_code', cleanRef)
      .eq('status', 'pending');
    const held = (openReqs || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const available = pending - held;

    // সর্বনিম্ন উইথড্র সীমা অ্যাডমিন সেটিংস থেকে
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

    const { error: insertErr } = await supabase.from('withdraw_requests').insert({
      ref_code: cleanRef,
      name: affiliate.name,
      contact: cleanMethod + ' - ' + cleanAccount,
      method: cleanMethod,
      account: cleanAccount,
      amount: reqAmount,
      status: 'pending',
    });

    if (insertErr) {
      return res.status(500).json({ error: 'সমস্যা হয়েছে: ' + insertErr.message });
    }

    return res.status(200).json({ amount: reqAmount, method: cleanMethod, account: cleanAccount, available: available - reqAmount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
