// /api/order-status.js
// পেমেন্ট থেকে ফিরে এলে এই এন্ডপয়েন্ট অর্ডারটা চেক করে এবং নিজে থেকেই কোর্স খুলে দেয়।
// webhook মিস হলেও এখানে সরাসরি ZiniPay-কে যাচাই করা হয়, তাই ম্যানুয়াল অনুমোদন লাগে না।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyWithZiniPay(invoiceId) {
  if (!invoiceId) return null;
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
      console.error('ZiniPay verify failed:', r.status, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (err) {
    console.error('ZiniPay verify error:', err);
    return null;
  }
}

function paidResponse(res, order) {
  return res.status(200).json({
    status: 'paid',
    course: order.course,
    courses: [order.course],
    contact: order.customer_contact,
  });
}

module.exports = async (req, res) => {
  const ref = (req.query && req.query.ref) || (req.body && req.body.ref);

  if (!ref) {
    return res.status(400).json({ error: 'ref required' });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('our_ref', ref)
    .maybeSingle();

  if (error || !order) {
    return res.status(404).json({ status: 'unknown' });
  }

  if (order.status === 'paid') {
    return paidResponse(res, order);
  }

  // এখনো paid না — ZiniPay-কে সরাসরি জিজ্ঞেস করি
  const verified = await verifyWithZiniPay(order.invoice_id);
  const zStatus = verified && String(verified.status || '').toUpperCase();

  if (zStatus === 'COMPLETED') {
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        transaction_id: verified.transaction_id || null,
        payment_method: verified.payment_method || null,
      })
      .eq('our_ref', ref);
    return paidResponse(res, order);
  }

  if (zStatus === 'FAILED') {
    await supabase.from('orders').update({ status: 'failed' }).eq('our_ref', ref);
    return res.status(200).json({ status: 'failed' });
  }

  // একই কাস্টমারের অন্য কোনো paid অর্ডার থাকলে সেটিও খুলে দিই
  if (order.customer_contact) {
    const { data: others } = await supabase
      .from('orders')
      .select('course,status,customer_contact')
      .eq('customer_contact', order.customer_contact)
      .eq('status', 'paid');
    if (others && others.length) {
      return res.status(200).json({
        status: 'paid',
        course: others[0].course,
        courses: [...new Set(others.map((o) => o.course))],
        contact: order.customer_contact,
      });
    }
  }

  return res.status(200).json({ status: 'pending' });
};
