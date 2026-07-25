// /api/lookup-order.js
// কাস্টমার ফোন/ইমেইল দিয়ে তার কেনা কোর্স(গুলো) আবার খুঁজে বের করতে পারবে
// (lifetime access — পেমেন্টের পরের পেজ হারিয়ে গেলেও এখান থেকে পাওয়া যাবে)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contact } = req.body;
    if (!contact) {
      return res.status(400).json({ error: 'contact required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('course, created_at')
      .eq('customer_contact', contact.trim())
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Server error' });
    }

    // একই কোর্স একাধিকবার থাকলে ইউনিক করে দিচ্ছি
    const courses = [...new Set((data || []).map(o => o.course))];

    return res.status(200).json({ courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
