// /api/affiliate-signup.js
// নতুন affiliate সাইনআপ — পাসওয়ার্ড সহ, আর এখন insert error সঠিকভাবে ধরা হয়

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
    const { name, contact, refCode, password } = req.body;

    if (!name || !contact || !refCode || !password) {
      return res.status(400).json({ error: 'সব ঘর পূরণ করুন' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
    }

    const cleanRef = refCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanRef.length < 3) {
      return res.status(400).json({ error: 'ref code কমপক্ষে ৩ অক্ষরের হতে হবে (শুধু ইংরেজি অক্ষর/সংখ্যা)' });
    }

    const { data: existing } = await supabase
      .from('affiliates')
      .select('ref_code')
      .eq('ref_code', cleanRef)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'এই ref code আগে থেকেই ব্যবহার হচ্ছে, অন্য একটা দিন' });
    }

    const { error: insertErr } = await supabase.from('affiliates').insert({
      ref_code: cleanRef,
      name,
      contact,
      commission_percent: 20,
      active: true,
      paid_out: 0,
      password_hash: hashPassword(password),
    });

    // ⚠️ এখন insert error সঠিকভাবে চেক করা হচ্ছে — আগে এটা silently ignore হতো
    if (insertErr) {
      console.error('Insert error:', insertErr);
      return res.status(500).json({ error: 'ডাটাবেসে সমস্যা: ' + insertErr.message });
    }

    return res.status(200).json({ refCode: cleanRef });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
