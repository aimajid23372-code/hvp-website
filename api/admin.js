const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const crypto = require('crypto');

function daysAgoISO(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString(); }

async function verifyWithZiniPay(invoiceId) {
  if (!invoiceId) return null;
  try {
    const r = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'zini-api-key': process.env.ZINIPAY_API_KEY },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    return r.ok ? await r.json() : null;
  } catch (err) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const { adminPassword, action } = body;
    
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (action === 'auth') return res.status(200).json({ ok: true });

    // Orders search/verify
    if (action === 'search') {
      const q = String(body.query || '').trim();
      let sel = supabase.from('orders').select('*');
      if (q) {
        if (q.includes('@')) {
          sel = sel.ilike('customer_contact', '%' + q.toLowerCase() + '%');
        } else if (/^[0-9\s+\-]+$/.test(q)) {
          sel = sel.ilike('customer_contact', '%' + q.replace(/[^0-9]/g, '').slice(-10) + '%');
        } else {
          sel = sel.or(`our_ref.eq.${q},invoice_id.eq.${q}`);
        }
      }
      const { data, error } = await sel.order('created_at', { ascending: false }).limit(30);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    if (action === 'verify') {
      const { data: order } = await supabase.from('orders').select('*').eq('our_ref', body.orderId).maybeSingle();
      if (!order) return res.status(404).json({ error: 'Not found' });
      const invId = body.invoiceId || order.invoice_id;
      const v = await verifyWithZiniPay(invId);
      if (!v) return res.status(200).json({ result: 'No ZiniPay data' });
      if (String(v.status || '').toUpperCase() === 'COMPLETED') {
        await supabase.from('orders').update({ status: 'paid', invoice_id: invId, transaction_id: v.transaction_id, payment_method: v.payment_method }).eq('our_ref', body.orderId);
        return res.status(200).json({ result: 'Paid successfully' });
      }
      return res.status(200).json({ result: 'ZiniPay status: ' + v.status });
    }

    if (action === 'bulkAdd') {
      const lines = String(body.students || '').split('\n').map((l) => l.trim()).filter(Boolean);
      const rows = [];
      for (const line of lines) {
        const parts = line.split(/[,\t;|]+/).map((x) => x.trim());
        const name = parts[0] || 'Student';
        const contact = parts[1] || '';
        let course = (parts[2] || 'bundle').toLowerCase();
        if (course !== 'short') course = 'bundle';
        if (contact) rows.push({ customer_name: name, customer_contact: contact, course, amount: course === 'short' ? 499 : 950, our_ref: crypto.randomUUID(), status: 'paid', payment_method: 'old-student' });
      }
      if (!rows.length) return res.status(400).json({ error: 'No valid lines' });
      await supabase.from('orders').insert(rows);
      return res.status(200).json({ result: 'Added ' + rows.length + ' students' });
    }

    // Withdrawals
    if (action === 'withdrawList') {
      const { data } = await supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
      return res.status(200).json({ requests: data || [] });
    }
    if (action === 'withdrawApprove') {
      const { data: reqRow } = await supabase.from('withdraw_requests').select('*').eq('id', body.requestId).single();
      if (!reqRow) return res.status(404).json({ error: 'Not found' });
      const { data: affiliate } = await supabase.from('affiliates').select('paid_out').eq('ref_code', reqRow.ref_code).single();
      await supabase.from('affiliates').update({ paid_out: Number(affiliate?.paid_out || 0) + Number(reqRow.amount) }).eq('ref_code', reqRow.ref_code);
      await supabase.from('withdraw_requests').update({ status: 'paid' }).eq('id', body.requestId);
      return res.status(200).json({ success: true });
    }

    // Promos
    if (action === 'promoList') {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
      return res.status(200).json({ promos: data || [] });
    }
    if (action === 'promoAdd') {
      await supabase.from('promo_codes').upsert({ code: String(body.code).toUpperCase(), discount_percent: Number(body.discount), active: true });
      return res.status(200).json({ success: true });
    }
    if (action === 'promoToggle') {
      await supabase.from('promo_codes').update({ active: body.active }).eq('code', body.code);
      return res.status(200).json({ success: true });
    }
    if (action === 'promoDelete') {
      await supabase.from('promo_codes').delete().eq('code', body.code);
      return res.status(200).json({ success: true });
    }

    // Customer Wallet is intentionally disabled; Affiliate Withdrawals remain active.

    // Settings
    if (action === 'settingsGet') {
      const { data } = await supabase.from('settings').select('*');
      return res.status(200).json({ settings: data || [] });
    }
    if (action === 'settingsSave') {
      await supabase.from('settings').upsert({ id: body.key, key: body.key, value: body.value });
      return res.status(200).json({ result: 'Saved' });
    }

    // Analytics
    if (action === 'analytics') {
      const since = daysAgoISO(30);
      const { data: events } = await supabase.from('site_events').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(1000);
      const { data: orders } = await supabase.from('orders').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(300);
      return res.status(200).json({ events: events || [], orders: orders || [] });
    }

    // Affiliate Management
    if (action === 'affiliateList') {
      const { data, error } = await supabase.from('affiliates').select('ref_code, name, contact, commission_percent, active, paid_out');
      if (error) return res.status(500).json({ error: error.message, detail: error });
      return res.status(200).json({ affiliates: data || [] });
    }
    if (action === 'affiliateSetCommission') {
      const ref = String(body.refCode || '').trim().toLowerCase();
      const pct = Math.min(100, Math.max(0, Number(body.commission)));
      if (!ref) return res.status(400).json({ error: 'refCode required' });
      const { error } = await supabase.from('affiliates').update({ commission_percent: pct }).eq('ref_code', ref);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, ref_code: ref, commission_percent: pct });
    }
    if (action === 'affiliateToggle') {
      const ref = String(body.refCode || '').trim().toLowerCase();
      await supabase.from('affiliates').update({ active: body.active }).eq('ref_code', ref);
      return res.status(200).json({ success: true });
    }
    if (action === 'affiliateDelete') {
      const ref = String(body.refCode || '').trim().toLowerCase();
      await supabase.from('affiliates').delete().eq('ref_code', ref);
      return res.status(200).json({ success: true });
    }

    // ===== Dashboard =====
    if (action === 'dashboard') {
      const from = body.from ? new Date(body.from).toISOString() : daysAgoISO(30);
      const to = body.to ? new Date(new Date(body.to).getTime() + 86400000).toISOString() : new Date(Date.now() + 86400000).toISOString();
      const { data: orders } = await supabase.from('orders').select('*').gte('created_at', from).lt('created_at', to).order('created_at', { ascending: false }).limit(2000);
      const list = orders || [];
      const paid = list.filter((o) => o.status === 'paid');
      const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
      const byDay = {};
      paid.forEach((o) => {
        const d = String(o.created_at || '').slice(0, 10);
        byDay[d] = (byDay[d] || 0) + Number(o.amount || 0);
      });
      const byCourse = {};
      paid.forEach((o) => {
        const c = String(o.course || 'unknown');
        byCourse[c] = byCourse[c] || { course: c, count: 0, revenue: 0 };
        byCourse[c].count += 1;
        byCourse[c].revenue += Number(o.amount || 0);
      });
      const customers = new Set(paid.map((o) => String(o.linked_email || o.customer_contact || '').toLowerCase()).filter(Boolean));
      let pendingReviews = 0;
      try {
        const r = await supabase.from('reviews').select('id', { count: 'exact', head: true }).neq('status', 'approved');
        pendingReviews = r.count || 0;
      } catch (e) { pendingReviews = 0; }
      let pageViews = 0;
      let checkoutStarts = 0;
      try {
        const ev = await supabase.from('site_events').select('event').gte('created_at', from).lt('created_at', to).limit(5000);
        (ev.data || []).forEach((x) => { if (x.event === 'pageview') pageViews += 1; if (x.event === 'payment_click') checkoutStarts += 1; });
      } catch (e) {}
      let pendingWithdraw = 0;
      try {
        const w = await supabase.from('withdraw_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        pendingWithdraw = w.count || 0;
      } catch (e) { pendingWithdraw = 0; }
      return res.status(200).json({
        revenue,
        total_orders: list.length,
        paid_orders: paid.length,
        pending_orders: list.filter((o) => o.status !== 'paid').length,
        customers: customers.size,
        pending_reviews: pendingReviews,
        pending_withdraws: pendingWithdraw,
        page_views: pageViews,
        checkout_starts: checkoutStarts,
        conversion_rate: pageViews ? Number(((paid.length / pageViews) * 100).toFixed(1)) : 0,
        average_order_value: paid.length ? Math.round(revenue / paid.length) : 0,
        by_day: Object.keys(byDay).sort().map((d) => ({ date: d, amount: byDay[d] })),
        top_courses: Object.values(byCourse).sort((a, b) => b.revenue - a.revenue),
        recent: list.slice(0, 10),
      });
    }

    // ===== Orders list =====
    if (action === 'ordersList') {
      let q = supabase.from('orders').select('*');
      if (body.status && body.status !== 'all') {
        if (body.status === 'paid') q = q.eq('status', 'paid');
        else q = q.neq('status', 'paid');
      }
      if (body.from) q = q.gte('created_at', new Date(body.from).toISOString());
      if (body.to) q = q.lt('created_at', new Date(new Date(body.to).getTime() + 86400000).toISOString());
      const { data, error } = await q.order('created_at', { ascending: false }).limit(Number(body.limit) || 200);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }
    if (action === 'orderMarkPaid') {
      const { error } = await supabase.from('orders').update({ status: 'paid', payment_method: 'manual-admin' }).eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'orderDelete') {
      const { error } = await supabase.from('orders').delete().eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'orderGrant') {
      const contact = String(body.contact || '').toLowerCase().trim();
      let course = String(body.course || 'bundle').toLowerCase();
      const { data: grantProduct } = await supabase.from('products').select('slug').eq('slug', course).maybeSingle();
      if (!grantProduct && !['bundle', 'short', 'long'].includes(course)) return res.status(400).json({ error: 'কোর্সটি পাওয়া যায়নি' });
      if (!contact) return res.status(400).json({ error: 'contact required' });
      const row = {
        customer_name: body.name || 'Manual Access',
        customer_contact: contact,
        course,
        amount: Number(body.amount || 0),
        our_ref: crypto.randomUUID(),
        status: 'paid',
        payment_method: 'manual-admin',
      };
      if (contact.includes('@')) row.linked_email = contact;
      const { error } = await supabase.from('orders').insert(row);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ===== Customers =====
    if (action === 'customers') {
      const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3000);
      const map = {};
      (orders || []).forEach((o) => {
        const key = String(o.linked_email || o.customer_contact || '').toLowerCase().trim();
        if (!key) return;
        map[key] = map[key] || { contact: key, name: o.customer_name || '', courses: [], spent: 0, orders: 0, last: o.created_at };
        map[key].orders += 1;
        if (o.status === 'paid') {
          map[key].spent += Number(o.amount || 0);
          const c = String(o.course || '');
          if (c && !map[key].courses.includes(c)) map[key].courses.push(c);
        }
      });
      let out = Object.values(map).sort((a, b) => b.spent - a.spent);
      const search = String(body.query || '').toLowerCase().trim();
      if (search) out = out.filter((c) => c.contact.includes(search) || String(c.name).toLowerCase().includes(search));
      return res.status(200).json({ customers: out.slice(0, 500) });
    }

    // ===== Reviews =====
    if (action === 'reviewList') {
      let q = supabase.from('reviews').select('*');
      const st = String(body.status || 'pending');
      if (st === 'pending') q = q.neq('status', 'approved');
      else if (st !== 'all') q = q.eq('status', st);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(300);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ reviews: data || [] });
    }
    if (action === 'reviewSet') {
      const st = String(body.status || 'approved');
      const { error } = await supabase.from('reviews').update({ status: st }).eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'reviewDelete') {
      const { error } = await supabase.from('reviews').delete().eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ===== Products (courses & content) =====
    if (action === 'productList') {
      const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
      if (error) return res.status(200).json({ products: [], warning: error.message });
      return res.status(200).json({ products: data || [] });
    }
    if (action === 'productSave') {
      const p = body.product || {};
      const slug = String(p.slug || '').toLowerCase().trim();
      if (!slug) return res.status(400).json({ error: 'slug required' });
      const row = {
        slug,
        title: p.title || slug,
        price: Number(p.price || 0),
        thumbnail: p.thumbnail || null,
        short_description: p.short_description || null,
        description: p.description || null,
        regular_price: Number(p.regular_price || p.price || 0),
        featured: p.featured === true,
        drive_link: p.drive_link || null,
        prompt: p.prompt || null,
        active: p.active !== false,
        sort_order: Number(p.sort_order || 0),
      };
      const { error } = await supabase.from('products').upsert(row, { onConflict: 'slug' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'productToggle') {
      const { error } = await supabase.from('products').update({ active: body.active === true }).eq('slug', String(body.slug || ''));
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'productDelete') {
      const slug = String(body.slug || '');
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('course', slug);
      if (count) return res.status(409).json({ error: 'এই কোর্সে অর্ডার আছে। Delete না করে Unpublish করুন।' });
      const { error } = await supabase.from('products').delete().eq('slug', slug);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
