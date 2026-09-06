const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  const { data } = await supabase.from('settings').select('*');
  return res.status(200).json({ settings: data || [] });
};

