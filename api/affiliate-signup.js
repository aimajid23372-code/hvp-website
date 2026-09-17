// /api/affiliate-signup.js
// নতুন affiliate সাইনআপ।
// (১) সাইটে Google/ইমেইল দিয়ে লগইন থাকলে token পাঠালেই হয় — পাসওয়ার্ড লাগে না
// (২) পুরোনো নিয়মে name + contact + refCode + password দিয়েও খোলা যায়
// (৩) action:'link' দিয়ে পুরোনো affiliate অ্যাকাউন্ট নিজের ইমেইলের সাথে জুড়ে দেওয়া যায়

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'hvb_static_salt_2026').digest('hex');
}

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
    const { name, contact, refCode, password, token, action } = req.body || {};
    const email = await emailFromToken(token);

    // ---- পুরোনো অ্যাকাউন্ট নিজের ইমেইলের সাথে জুড়ে দেওয়া ----
    if (action === 'link') {
      if (!email) return res.status(401).json({ error: 'আগে সাইটে লগইন করুন' });
      if (!refCode || !password) return res.status(400).json({ error: 'ref code ও পাসওয়ার্ড দিন' });
      const cleanRef = String(refCode).trim().toLowerCase();
      const { data: aff } = await supabase.from('affiliates').select('*').eq('ref_code', cleanRef).single();
      if (!aff) return res.status(404).json({ error: 'এই ref code খুঁজে পাওয়া যায়নি' });
      if (aff.password_hash !== hashPassword(password)) return res.status(401).json({ error: 'পাসওয়ার্ড ভুল' });
      const { error: upErr } = await supabase.from('affiliates').update({ email }).eq('ref_code', cleanRef);
      if (upErr) return res.status(500).json({ error: 'সমস্যা: ' + upErr.message });
      return res.status(200).json({ refCode: cleanRef, linked: true });
    }

    if (!name || !refCode) {
      return res.status(400).json({ error: 'নাম ও ref code দিন' });
    }
    if (!email && !password) {
      return res.status(400).json({ error: 'পাসওয়ার্ড দিন, অথবা Google দিয়ে লগইন করুন' });
    }
    if (!email && (!contact || String(contact).trim().length < 6)) {
      return res.status(400).json({ error: 'যোগাযোগের নাম্বার দিন' });
    }
    if (password && String(password).length < 4) {
      return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' });
    }

    const cleanRef = String(refCode).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanRef.length < 3) {
      return res.status(400).json({ error: 'ref code কমপক্ষে ৩ অক্ষরের হতে হবে (শুধু ইংরেজি অক্ষর/সংখ্যা)' });
    }

    const { data: existing } = await supabase
      .from('affiliates')
      .select('ref_code')
      .eq('ref_code', cleanRef)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'এই ref code আগে থেকেই ব্যবহার হচ্ছে, অন্য একটা দিন' });
    }

    // এক ইমেইলে একটাই অ্যাফিলিয়েট অ্যাকাউন্ট
    if (email) {
      const { data: mine } = await supabase.from('affiliates').select('ref_code').ilike('email', email).limit(1);
      if (mine && mine.length) {
        return res.status(409).json({ error: 'এই অ্যাকাউন্টে আগে থেকেই অ্যাফিলিয়েট আছে', refCode: mine[0].ref_code });
      }
    }

    const row = {
      ref_code: cleanRef,
      name,
      contact: contact || email || '',
      commission_percent: 20,
      active: true,
      paid_out: 0,
    };
    if (password) { row.password_hash = hashPassword(password); row.password_plain = password; }
    if (email) row.email = email;

    let { error: insertErr } = await supabase.from('affiliates').insert(row);

    // email কলাম না থাকলেও যেন সাইনআপ আটকে না যায়
    if (insertErr) {
      const retryRow = Object.assign({}, row);
      delete retryRow.email;
      delete retryRow.password_plain;
      const retry = await supabase.from('affiliates').insert(retryRow);
      insertErr = retry.error;
    }

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
