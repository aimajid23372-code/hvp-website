// /api/my-access.js
// Google লগইন করা ইউজারের টোকেন যাচাই করে তার কেনা কোর্স ফেরত দেয়।
// action:'link' দিলে পুরোনো (ফোন নাম্বার দিয়ে কেনা) অর্ডারকে এই ইমেইলের সাথে যুক্ত করে,
// যাতে পরের বার শুধু Google লগইনেই কোর্স চলে আসে।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SECURE CONTENT STORAGE & HELPERS
const { COURSE_CONTENT, normalizeCourse, buildContentResponse } = require('./_course_content');

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
  if (req.method === 'GET') {
    if (req.query && req.query.reviews) {
      const course = String(req.query.reviews);
      let q = supabase
        .from('reviews')
        .select('name,email,course,rating,body,image_url,link,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(60);
      if (course && course !== 'all') q = q.eq('course', course);
      const { data, error } = await q;
      if (error) return res.status(200).json({ items: [], count: 0, avg: 0 });
      const items = (data || []).map((r) => ({
        name: r.name || (r.email ? r.email.split('@')[0] : 'HVB শিক্ষার্থী'),
        course: r.course,
        rating: r.rating,
        body: r.body,
        image_url: r.image_url,
        link: r.link,
        created_at: r.created_at,
      }));
      const avg = items.length ? items.reduce((a, b) => a + (Number(b.rating) || 0), 0) / items.length : 0;
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(200).json({ items, count: items.length, avg });
    }

    const url = process.env.SUPABASE_URL || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || '';
    if (!url || !anonKey) return res.status(200).json({ enabled: false });
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ enabled: true, url, anonKey });
  }

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

    if (body.action === 'review_add') {
      const orders = await ordersForEmail(email);
      const owned = [...new Set(orders.filter((o) => o.status === 'paid').map((o) => o.course))];
      if (!owned.length) return res.status(403).json({ error: 'শুধু কোর্স কেনা শিক্ষার্থীরাই রিভিউ দিতে পারেন' });

      const course = owned.includes(String(body.course)) ? String(body.course) : owned[0];
      const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
      const text = String(body.body || '').trim().slice(0, 1200);
      if (text.length < 10) return res.status(400).json({ error: 'রিভিউ অন্তত ১০ অক্ষরের হতে হবে' });
      const httpOnly = (v) => (/^https?:\/\//i.test(String(v || '').trim()) ? String(v).trim().slice(0, 600) : null);

      const row = {
        course,
        email,
        name: String(body.name || email.split('@')[0]).slice(0, 80),
        rating,
        body: text,
        image_url: httpOnly(body.image_url),
        link: httpOnly(body.link),
        status: 'pending',
      };

      const { error } = await supabase.from('reviews').insert(row);
      if (error) {
        console.error('review insert error:', error);
        return res.status(500).json({ error: 'রিভিউ সেভ করা যায়নি' });
      }
      return res.status(200).json({ ok: true, msg: 'আপনার রিভিউ সফলভাবে জমা হয়েছে। অ্যাডমিন অ্যাপ্রুভ করার পর ওয়েবসাইটে দেখা যাবে।' });
    }

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
      const rawAll = all.filter((o) => o.status === 'paid').map((o) => o.course);
      const courses = [...new Set(rawAll.map(normalizeCourse))];
      return res.status(200).json({ email, linked: paid.length, courses, content: buildContentResponse(rawAll) });
    }

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
    const rawOrders = orders.filter((o) => o.status === 'paid').map((o) => o.course);
    const courses = [...new Set(rawOrders.map(normalizeCourse))];
    
    // Return both the list of courses AND the secure content payload
    return res.status(200).json({ email, courses, content: buildContentResponse(rawOrders) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

