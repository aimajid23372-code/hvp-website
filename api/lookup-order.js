// /api/lookup-order.js
// কাস্টমার ফোন/ইমেইল দিয়ে তার কেনা কোর্স খুঁজে বের করবে।
// নাম্বার +880 / 880 / স্পেস / ড্যাশ যেভাবেই লেখা হোক — শেষ ১০ ডিজিট মিলিয়ে খোঁজে।
// এখনো pending থাকা অর্ডার থাকলে ZiniPay-তে যাচাই করে paid করে দেয়।

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
    return r.ok ? data : null;
  } catch (err) {
    console.error('verify error:', err);
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const raw = (req.body && req.body.contact) || '';
    const contact = String(raw).trim();
    if (!contact) {
      return res.status(400).json({ error: 'contact required' });
    }

    let query = supabase.from('orders').select('*');

    if (contact.includes('@')) {
      query = query.ilike('customer_contact', contact.toLowerCase());
    } else {
      const digits = contact.replace(/[^0-9]/g, '');
      const tail = digits.slice(-10); // 01XXXXXXXXX এর শেষ ১০ ডিজিট
      if (tail.length < 6) {
        return res.status(400).json({ error: 'সঠিক নাম্বার দিন' });
      }
      query = query.ilike('customer_contact', '%' + tail + '%');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('lookup error:', error);
      return res.status(500).json({ error: 'Server error' });
    }

    const orders = data || [];

    // pending অর্ডারগুলো ZiniPay-তে যাচাই করে নিই (webhook মিস হলেও কাজ করবে)
    for (const o of orders) {
      if (o.status !== 'paid' && o.invoice_id) {
        const verified = await verifyWithZiniPay(o.invoice_id);
        if (verified && String(verified.status || '').toUpperCase() === 'COMPLETED') {
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              transaction_id: verified.transaction_id || null,
              payment_method: verified.payment_method || null,
            })
            .eq('invoice_id', o.invoice_id);
          o.status = 'paid';
        }
      }
    }

    const courses = [...new Set(orders.filter(o => o.status === 'paid').map(o => o.course))];

    return res.status(200).json({ courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
