// /api/order-status.js
// ফ্রন্টএন্ড পেমেন্ট থেকে ফিরে এলে এই এন্ডপয়েন্ট দিয়ে চেক করবে
// অর্ডার "paid" হয়েছে কিনা (আমাদের নিজস্ব "ref" দিয়ে খুঁজে বের করে)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ error: 'ref required' });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('our_ref', ref)
    .single();

  if (error || !data) {
    return res.status(404).json({ status: 'unknown' });
  }

  return res.status(200).json({ status: data.status });
};
