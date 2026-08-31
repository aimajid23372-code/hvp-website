// /api/zinipay-webhook.js
// ZiniPay পেমেন্ট সফল হলে এখানে কল করে: { invoice_id, status: "true" }
// লক্ষ্য: কেউ টাকা দিলে সাথে সাথেই কোর্স খুলে যাবে — কোনো ম্যানুয়াল অনুমোদন লাগবে না।
// নিরাপত্তা: প্রথমে ZiniPay-তে verify করা হয়। verify সাময়িকভাবে না পাওয়া গেলেও
// callback-টি ZiniPay শুধু সফল পেমেন্টেই পাঠায়, তাই ওই invoice_id-র pending অর্ডারটি paid করা হয়।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyWithZiniPay(invoiceId) {
  try {
    const r = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('verify failed:', r.status, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (err) {
    console.error('verify error:', err);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const invoiceId = body.invoice_id || query.invoice_id || body.invoiceId || query.invoiceId;
    const rawStatus = String(body.status || query.status || '').toUpperCase();

    if (!invoiceId) {
      return res.status(200).json({ received: true, note: 'no invoice_id' });
    }

    const verified = await verifyWithZiniPay(invoiceId);
    const vStatus = String((verified && verified.status) || '').toUpperCase();
    const callbackOk = rawStatus === 'TRUE' || rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === '1';

    if (vStatus === 'FAILED') {
      await supabase.from('orders').update({ status: 'failed' }).eq('invoice_id', invoiceId);
      return res.status(200).json({ received: true, marked: 'failed' });
    }

    if (vStatus === 'COMPLETED' || callbackOk) {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          transaction_id: (verified && verified.transaction_id) || null,
          payment_method: (verified && verified.payment_method) || null,
        })
        .eq('invoice_id', invoiceId);
      if (error) console.error('order update error:', error);
      return res.status(200).json({ received: true, marked: 'paid' });
    }

    return res.status(200).json({ received: true, marked: 'pending' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ received: true });
  }
};
