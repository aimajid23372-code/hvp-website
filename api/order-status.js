const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const { invoice_id } = req.query;

  if (!invoice_id) {
    return res.status(400).json({ error: 'invoice_id required' });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('invoice_id', invoice_id)
    .single();

  if (error || !data) {
    return res.status(404).json({ status: 'unknown' });
  }

  return res.status(200).json({ status: data.status });
};
