// /api/auth-config.js — Zero-dependency endpoint for Supabase Auth public config
module.exports = (req, res) => {
  const url = (process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !anonKey) {
    return res.status(200).json({ enabled: false, reason: 'missing_env' });
  }
  return res.status(200).json({ enabled: true, url, anonKey });
};
