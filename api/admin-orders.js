// /api/admin-orders.js
// শুধু Admin ব্যবহার করবেন — অর্ডার খুঁজে দেখা, ZiniPay-তে যাচাই করা,
// এবং দরকার হলে হাতে হাতে "paid" করে কোর্স খুলে দেওয়া।

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
    const { adminPassword, action, query, orderId, invoiceId } = req.body || {};

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'ভুল Admin পাসওয়ার্ড' });
    }

    if (action === 'auth') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'search') {
      const q = String(query || '').trim();
      if (!q) return res.status(400).json({ error: 'কিছু একটা লিখুন' });

      let sel = supabase.from('orders').select('*');
      if (q.includes('@')) {
        sel = sel.ilike('customer_contact', '%' + q.toLowerCase() + '%');
      } else if (/^[0-9\s+\-]+$/.test(q)) {
        sel = sel.ilike('customer_contact', '%' + q.replace(/[^0-9]/g, '').slice(-10) + '%');
      } else {
        sel = sel.or(`our_ref.eq.${q},invoice_id.eq.${q}`);
      }

      const { data, error } = await sel.order('created_at', { ascending: false }).limit(30);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    if (action === 'verify') {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('our_ref', orderId)
        .maybeSingle();
      if (!order) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });

      const invId = invoiceId || order.invoice_id;
      const v = await verifyWithZiniPay(invId);
      if (!v) return res.status(200).json({ result: 'ZiniPay থেকে কোনো তথ্য পাওয়া যায়নি (invoice id নেই বা ভুল)' });

      if (String(v.status || '').toUpperCase() === 'COMPLETED') {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            invoice_id: invId,
            transaction_id: v.transaction_id || null,
            payment_method: v.payment_method || null,
          })
          .eq('our_ref', orderId);
        return res.status(200).json({ result: '✅ ZiniPay বলছে পেমেন্ট সফল — কোর্স খুলে দেওয়া হয়েছে।' });
      }
      return res.status(200).json({ result: 'ZiniPay স্ট্যাটাস: ' + (v.status || 'অজানা') });
    }

    if (action === 'markPaid') {
      if (!orderId) return res.status(400).json({ error: 'orderId দিন' });
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_method: 'manual-admin' })
        .eq('our_ref', orderId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ result: '✅ অর্ডারটি paid করা হয়েছে — কাস্টমার এখন কোর্স পাবেন।' });
    }


    if (action === 'bulkAdd') {
      // পুরোনো স্টুডেন্ট যোগ করা — প্রতি লাইনে: নাম, নাম্বার, প্যাকেজ(bundle/short)
      const lines = String(req.body.students || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) return res.status(400).json({ error: 'লিস্ট খালি' });

      const rows = [];
      const bad = [];
      for (const line of lines) {
        const parts = line.split(/[,\t;|]+/).map((x) => x.trim());
        const name = parts[0] || '';
        const contact = parts[1] || '';
        let course = (parts[2] || 'bundle').toLowerCase();
        if (course !== 'short') course = 'bundle';
        if (!contact) {
          bad.push(line);
          continue;
        }
        rows.push({
          customer_name: name || 'পুরোনো স্টুডেন্ট',
          customer_contact: contact,
          course,
          amount: course === 'short' ? 499 : ৮৫০,
          our_ref: crypto.randomUUID(),
          status: 'paid',
          payment_method: 'old-student',
        });
      }

      if (!rows.length) return res.status(400).json({ error: 'কোনো সঠিক লাইন পাওয়া যায়নি' });

      const { error } = await supabase.from('orders').insert(rows);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({
        result: '✅ ' + rows.length + ' জন স্টুডেন্ট যোগ হয়েছে' + (bad.length ? ' (বাদ পড়েছে ' + bad.length + ' লাইন)' : ''),
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
