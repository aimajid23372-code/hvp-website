// /api/affiliate-stats.js
// Affiliate ref code + password দিয়ে লগইন করে তার বিস্তারিত সেল হিস্টোরি দেখবে

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

    const { data: orders } = await supabase
      .from('orders')
      .select('amount, course, created_at')
      .eq('affiliate_ref', cleanRef)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    const totalSales = (orders || []).reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommission = Math.round(totalSales * affiliate.commission_percent / 100);
    const paidOut = Number(affiliate.paid_out || 0);
    const pending = totalCommission - paidOut;

    // প্রতিটা বিক্রির বিস্তারিত (কবে, কোন কোর্স, কত টাকা, কমিশন কত) —
    // কাস্টমারের ফোন/ইমেইল দেখানো হচ্ছে না, কাস্টমারদের প্রাইভেসির জন্য
    const orderList = (orders || []).map(o => ({
      date: o.created_at,
      course: o.course,
      amount: Number(o.amount),
      commission: Math.round(Number(o.amount) * affiliate.commission_percent / 100),
    }));

    return res.status(200).json({
      name: affiliate.name,
      commissionPercent: affiliate.commission_percent,
      totalOrders: (orders || []).length,
      totalSales,
      totalCommission,
      paidOut,
      pending,
      orders: orderList,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
