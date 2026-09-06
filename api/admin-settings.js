const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { adminPassword, action, key, value } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  if (action === 'get') {
    const { data } = await supabase.from('settings').select('*');
    return res.status(200).json({ settings: data || [] });
  }

  if (action === 'save') {
    const { error } = await supabase.from('settings').upsert({ id: key, key: key, value: value });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ result: 'Settings saved successfully' });
  }

  return res.status(400).json({ error: 'Unknown action' });
};

