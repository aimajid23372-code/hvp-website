// /api/zinipay-webhook.js
// ZiniPay পেমেন্ট শেষে এখানে কল করে। ZiniPay পাঠায় { invoice_id, status: "true" }
// (আগের কোডে শুধু status === 'COMPLETED' চেক করা হতো, তাই কখনোই কাজ করতো না)
// এখানে আবার ZiniPay-কে verify করে তবেই paid করা হয় — এটাই নিরাপদ।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const invoiceId = body.invoice_id || query.invoice_id;

    if (!invoiceId) {
      return res.status(200).json({ received: true, note: 'no invoice_id' });
    }

    const vr = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    const verified = await vr.json();
    const status = String((verified && verified.status) || '').toUpperCase();

    if (vr.ok && status === 'COMPLETED') {
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          transaction_id: verified.transaction_id || null,
          payment_method: verified.payment_method || null,
        })
        .eq('invoice_id', invoiceId);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ received: true });
  }
};
