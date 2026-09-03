// /api/withdraw-request.js
// Affiliate ১০০০ টাকা বা তার বেশি জমলে withdraw রিকোয়েস্ট পাঠাতে পারবে

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'hvb_static_salt_2026').digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refCode, password } = req.body;
    if (!refCode || !password) {
      return res.status(400).json({ error: 'ref code ও পাসওয়ার্ড দিন' });
    }

    const cleanRef = refCode.trim().toLowerCase();

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

    // পাওনা হিসাব করা
    const { data: orders } = await supabase
      .from('orders')
      .select('amount')
      .eq('affiliate_ref', cleanRef)
      .eq('status', 'paid');

    const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommission = Math.round(totalSales * affiliate.commission_percent / 100);
    const paidOut = Number(affiliate.paid_out || 0);
    const pending = totalCommission - paidOut;

    if (pending < 500) {
      return res.status(400).json({ error: 'কমপক্ষে ৫০০ টাকা পাওনা হলে তবেই Withdraw রিকোয়েস্ট পাঠানো যাবে। আপনার বর্তমান পাওনা: ' + pending + ' ৳' });
    }

    // আগে থেকে pending রিকোয়েস্ট থাকলে আবার পাঠাতে দিব না
    const { data: existingReq } = await supabase
      .from('withdraw_requests')
      .select('id')
      .eq('ref_code', cleanRef)
      .eq('status', 'pending')
      .single();

    if (existingReq) {
      return res.status(409).json({ error: 'আপনার একটা Withdraw রিকোয়েস্ট আগে থেকেই Pending আছে, অপেক্ষা করুন।' });
    }

    const { error: insertErr } = await supabase.from('withdraw_requests').insert({
      ref_code: cleanRef,
      name: affiliate.name,
      contact: affiliate.contact,
      amount: pending,
      status: 'pending',
    });

    if (insertErr) {
      return res.status(500).json({ error: 'সমস্যা হয়েছে: ' + insertErr.message });
    }

    return res.status(200).json({ amount: pending });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
