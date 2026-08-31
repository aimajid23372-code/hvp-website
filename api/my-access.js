// /api/my-access.js
// Google লগইন করা ইউজারের টোকেন যাচাই করে তার কেনা কোর্স ফেরত দেয়।
// action:'link' দিলে পুরোনো (ফোন নাম্বার দিয়ে কেনা) অর্ডারকে এই ইমেইলের সাথে যুক্ত করে,
// যাতে পরের বার শুধু Google লগইনেই কোর্স চলে আসে।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getUserFromToken(token) {
  try {
    const r = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || '',
        Authorization: 'Bearer ' + token,
      },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? u : null;
  } catch (err) {
    console.error('token verify error:', err);
    return null;
  }
}

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
    return null;
  }
}

async function ordersForEmail(email) {
  // linked_email কলামটা না থাকলেও যেন ভাঙে না — তাই দুই ধাপে খোঁজে
  const out = [];
  const a = await supabase.from('orders').select('*').ilike('customer_contact', email);
  if (a.data) out.push(...a.data);
  const b = await supabase.from('orders').select('*').ilike('linked_email', email);
  if (b.data) out.push(...b.data);
  const seen = new Set();
  return out.filter((o) => {
    const k = o.id || o.our_ref || o.invoice_id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const token = String(body.access_token || '').trim();
    if (!token) return res.status(401).json({ error: 'login required' });

    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'invalid session' });

    const email = String(user.email).toLowerCase();

    // পুরোনো কেনা লিংক করা (ফোন নাম্বার / ইমেইল / Invoice ID দিয়ে)
    if (body.action === 'link') {
      const contact = String(body.contact || '').trim();
      if (!contact) return res.status(400).json({ error: 'contact required' });

      let q = supabase.from('orders').select('*');
      if (contact.includes('@')) {
        q = q.ilike('customer_contact', contact.toLowerCase());
      } else {
        const digits = contact.replace(/[^0-9]/g, '');
        const tail = digits.slice(-10);
        if (tail.length >= 6) q = q.ilike('customer_contact', '%' + tail + '%');
        else q = q.or(`our_ref.eq.${contact},invoice_id.eq.${contact}`);
      }

      const { data } = await q.order('created_at', { ascending: false });
      const found = data || [];

      for (const o of found) {
        if (o.status !== 'paid' && o.invoice_id) {
          const v = await verifyWithZiniPay(o.invoice_id);
          if (v && String(v.status || '').toUpperCase() === 'COMPLETED') {
            await supabase.from('orders').update({ status: 'paid' }).eq('invoice_id', o.invoice_id);
            o.status = 'paid';
          }
        }
      }

      const paid = found.filter((o) => o.status === 'paid');
      if (!paid.length) {
        return res.status(200).json({ email, linked: 0, courses: [] });
      }
      for (const o of paid) {
        await supabase.from('orders').update({ linked_email: email }).eq('id', o.id);
      }
      const all = await ordersForEmail(email);
      const courses = [...new Set(all.filter((o) => o.status === 'paid').map((o) => o.course))];
      return res.status(200).json({ email, linked: paid.length, courses });
    }

    // সাধারণ চেক: এই ইমেইলে কেনা কোর্সগুলো
    const orders = await ordersForEmail(email);
    for (const o of orders) {
      if (o.status !== 'paid' && o.invoice_id) {
        const v = await verifyWithZiniPay(o.invoice_id);
        if (v && String(v.status || '').toUpperCase() === 'COMPLETED') {
          await supabase.from('orders').update({ status: 'paid' }).eq('invoice_id', o.invoice_id);
          o.status = 'paid';
        }
      }
    }
    const courses = [...new Set(orders.filter((o) => o.status === 'paid').map((o) => o.course))];
    return res.status(200).json({ email, courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
