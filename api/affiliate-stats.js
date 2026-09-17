// /api/affiliate-stats.js
// Affiliate ড্যাশবোর্ডের সব ডেটা।
// লগইন দুইভাবে: (১) সাইটের Google/ইমেইল অ্যাকাউন্টের token দিয়ে — পাসওয়ার্ড লাগে না
//               (২) পুরোনো নিয়মে ref code + পাসওয়ার্ড
// একই এন্ডপয়েন্টে action:'savePayout' দিয়ে bKash/Nagad/Rocket নাম্বার সেভ/এডিট করা যায়।

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

// token বা ref+password দিয়ে affiliate খুঁজে বের করা
async function resolveAffiliate(body) {
  const { refCode, password, token } = body || {};
  const email = await emailFromToken(token);

  if (email) {
    const { data: rows } = await supabase.from('affiliates').select('*').ilike('email', email).limit(1);
    if (rows && rows.length) return { affiliate: rows[0], email };
    return { affiliate: null, email, code: 'no_affiliate' };
  }

  if (!refCode || !password) return { affiliate: null, code: 'need_login' };

  const cleanRef = String(refCode).trim().toLowerCase();
  const { data: affiliate } = await supabase.from('affiliates').select('*').eq('ref_code', cleanRef).single();
  if (!affiliate) return { affiliate: null, code: 'not_found' };
  if (affiliate.password_hash !== hashPassword(password)) return { affiliate: null, code: 'bad_password' };
  return { affiliate, email: null };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const found = await resolveAffiliate(body);

    if (!found.affiliate) {
      if (found.code === 'no_affiliate') {
        return res.status(404).json({ code: 'no_affiliate', email: found.email, error: 'এই অ্যাকাউন্টে এখনো অ্যাফিলিয়েট খোলা হয়নি' });
      }
      if (found.code === 'bad_password') return res.status(401).json({ error: 'পাসওয়ার্ড ভুল' });
      if (found.code === 'not_found') return res.status(404).json({ error: 'এই ref code খুঁজে পাওয়া যায়নি' });
      return res.status(400).json({ error: 'আগে লগইন করুন' });
    }

    const affiliate = found.affiliate;
    const cleanRef = affiliate.ref_code;

    // পেমেন্ট নাম্বার সেভ/এডিট
    if (body.action === 'savePayout') {
      const cleanMethod = ALLOWED_METHODS.find((m) => m.toLowerCase() === String(body.payMethod || '').trim().toLowerCase());
      if (!cleanMethod) return res.status(400).json({ error: 'bKash / Nagad / Rocket — যেকোনো একটি বেছে নিন' });
      const cleanAccount = String(body.payAccount || '').replace(/[^0-9]/g, '');
      if (!/^01[3-9][0-9]{8}$/.test(cleanAccount)) {
        return res.status(400).json({ error: 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 01712345678)' });
      }
      const { error: upErr } = await supabase
        .from('affiliates')
        .update({ pay_method: cleanMethod, pay_account: cleanAccount })
        .eq('ref_code', cleanRef);
      if (upErr) return res.status(500).json({ error: 'সেভ করা যায়নি: ' + upErr.message });
      affiliate.pay_method = cleanMethod;
      affiliate.pay_account = cleanAccount;
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('amount, course, created_at')
      .eq('affiliate_ref', cleanRef)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommission = Math.round(totalSales * affiliate.commission_percent / 100);
    const paidOut = Number(affiliate.paid_out || 0);

    const { data: adjs } = await supabase
      .from('affiliate_adjustments')
      .select('amount, note, created_at')
      .eq('ref_code', cleanRef)
      .order('created_at', { ascending: false });
    const adjust = (adjs || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

    let minWithdraw = 500;
    try {
      const { data: setRow } = await supabase.from('settings').select('value').eq('key', 'min_withdraw').maybeSingle();
      if (setRow && setRow.value) minWithdraw = Number(setRow.value) || 500;
    } catch (err) {}

    const pending = totalCommission + adjust - paidOut;

    let held = 0;
    let openRequests = [];
    try {
      const { data: wreqs } = await supabase
        .from('withdraw_requests')
        .select('amount, status, contact, created_at')
        .eq('ref_code', cleanRef)
        .eq('status', 'pending');
      held = (wreqs || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      openRequests = (wreqs || []).map((r) => ({ amount: Number(r.amount || 0), contact: r.contact || '', date: r.created_at }));
    } catch (e) { held = 0; }
    const available = pending - held;

    const orderList = (orders || []).map(o => ({
      date: o.created_at,
      course: o.course,
      amount: Number(o.amount),
      commission: Math.round(Number(o.amount) * affiliate.commission_percent / 100),
    }));

    return res.status(200).json({
      refCode: cleanRef,
      name: affiliate.name,
      contact: affiliate.contact || '',
      email: affiliate.email || found.email || '',
      payMethod: affiliate.pay_method || '',
      payAccount: affiliate.pay_account || '',
      commissionPercent: affiliate.commission_percent,
      totalOrders: (orders || []).length,
      totalSales,
      totalCommission,
      paidOut,
      adjust,
      adjustments: (adjs || []).map((a) => ({ amount: Number(a.amount || 0), note: a.note || '', date: a.created_at })),
      minWithdraw,
      pending,
      held,
      available,
      openRequests,
      orders: orderList,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
