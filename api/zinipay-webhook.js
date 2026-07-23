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
    const { invoice_id, status, transaction_id, payment_method } = req.body;

    if (status === 'COMPLETED') {
      await supabase
        .from('orders')
        .update({ status: 'paid', transaction_id, payment_method })
        .eq('invoice_id', invoice_id);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
