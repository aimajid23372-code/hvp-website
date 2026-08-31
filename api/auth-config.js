// /api/auth-config.js
// ব্রাউজারে Google লগইন চালু করার জন্য শুধু পাবলিক (anon) কী পাঠায়।
// এই দুইটা মান পাবলিক — সিক্রেট নয়। SERVICE KEY কখনোই এখানে যাবে না।

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    return res.status(200).json({ enabled: false });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ enabled: true, url, anonKey });
};
