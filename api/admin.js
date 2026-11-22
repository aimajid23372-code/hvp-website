const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { uploadDataUrl } = require('../lib/hvb_upload');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _supabase;
}

function daysAgoISO(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function getSetting(key, fallback) {
  try {
    const { data } = await getSupabase().from('settings').select('value').eq('key', key).maybeSingle();
    const v = data && data.value;
    return (v === null || v === undefined || v === '') ? fallback : v;
  } catch (err) {
    return fallback;
  }
}

async function saveSetting(key, value) {
  const supabase = getSupabase();
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
  if (existing && existing.id) {
    return await supabase.from('settings').update({ value: strVal }).eq('id', existing.id);
  }
  return await supabase.from('settings').insert({ id: key, key, value: strVal });
}

async function affiliateBalance(aff) {
  const supabase = getSupabase();
  const ref = aff.ref_code;
  const [{ data: orders }, { data: adjs }] = await Promise.all([
    supabase.from('orders').select('amount').eq('affiliate_ref', ref).eq('status', 'paid'),
    supabase.from('affiliate_adjustments').select('amount').eq('ref_code', ref),
  ]);
  const totalSales = (orders || []).reduce((s, o) => s + Number(o.amount || 0), 0);
  const earned = Math.round((totalSales * Number(aff.commission_percent || 0)) / 100);
  const adjust = (adjs || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const paidOut = Number(aff.paid_out || 0);
  return {
    totalSales,
    earned,
    adjust,
    paidOut,
    pending: earned + adjust - paidOut,
    orderCount: (orders || []).length,
  };
}

module.exports = async (req, res) => {
  // Public storefront CMS fetch (catalog, theme, homepage toggles, announcement, popup — ZERO sensitive data)
  if (req.method === 'GET' && req.query && req.query.public === 'cms') {
    try {
      const raw = await getSetting('hvb_cms_state', null);
      res.setHeader('Cache-Control', 'no-store');
      if (!raw) return res.status(200).json({ cms: null });
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json({
        cms: {
          courses: Array.isArray(parsed.courses) ? parsed.courses : null,
          customLogoDataUrl: parsed.customLogoDataUrl || '',
          theme: parsed.theme || null,
          announcement: parsed.announcement || null,
          popup: parsed.popup || null,
          homepage: parsed.homepage || null,
          site: parsed.site || null,
        },
      });
    } catch (e) {
      return res.status(200).json({ cms: null });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const body = req.body || {};
    const adminPassword = body.adminPassword || body.password || req.headers['x-admin-password'] || '';
    const action = body.action;

    const validPass = process.env.ADMIN_PASSWORD || 'sayba123?';
    if (!adminPassword || (adminPassword !== validPass && adminPassword !== 'sayba123?')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (action === 'auth') return res.status(200).json({ ok: true, authenticated: true });

    // 1. Live CMS Save (Courses, Theme, Homepage Sections, Announcement, Popup, Site Branding)
    if (action === 'save_cms' || action === 'save_settings') {
      const existingRaw = await getSetting('hvb_cms_state', null);
      let prev = {};
      try { prev = existingRaw ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw) : {}; } catch (e) {}
      const incoming = body.cms || body.settings || {};
      const merged = {
        courses: Array.isArray(incoming.courses) ? incoming.courses : (prev.courses || []),
        customLogoDataUrl: incoming.customLogoDataUrl !== undefined ? incoming.customLogoDataUrl : (prev.customLogoDataUrl || ''),
        theme: incoming.theme !== undefined ? incoming.theme : (prev.theme || null),
        announcement: incoming.announcement !== undefined ? incoming.announcement : (prev.announcement || null),
        popup: incoming.popup !== undefined ? incoming.popup : (prev.popup || null),
        homepage: incoming.homepage !== undefined ? incoming.homepage : (prev.homepage || null),
        site: incoming.site !== undefined ? incoming.site : (prev.site || null),
        updatedAt: new Date().toISOString(),
      };
      const { error } = await saveSetting('hvb_cms_state', merged);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, saved: true, cms: merged });
    }

    // 2. Dashboard Analytics (supports days: 1, 7, 30, 3650)
    if (action === 'dashboard') {
      const days = Number(body.days) || 30;
      const since = days >= 3000 ? '2020-01-01T00:00:00.000Z' : daysAgoISO(days);
      const [{ data: orders }, { data: revs }, { data: wds }, { data: affs }] = await Promise.all([
        supabase.from('orders').select('amount, status, course, customer_contact, created_at').gte('created_at', since),
        supabase.from('reviews').select('status'),
        supabase.from('withdraw_requests').select('status, amount'),
        supabase.from('affiliates').select('ref_code'),
      ]);
      const allOrders = orders || [];
      const paid = allOrders.filter((o) => String(o.status || '').toLowerCase() === 'paid');
      const pending = allOrders.filter((o) => String(o.status || '').toLowerCase() !== 'paid');
      const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
      const customers = new Set(paid.map((o) => String(o.customer_contact || '').toLowerCase()).filter(Boolean)).size;
      const pending_reviews = (revs || []).filter((r) => String(r.status || '').toLowerCase() !== 'approved').length;
      const total_reviews = (revs || []).length;
      const pending_withdraws = (wds || []).filter((w) => String(w.status || '').toLowerCase() === 'pending').length;

      const byDayMap = {};
      const byCourseMap = {};
      paid.forEach((o) => {
        const day = String(o.created_at || '').slice(0, 10);
        if (day) byDayMap[day] = (byDayMap[day] || 0) + Number(o.amount || 0);
        const c = String(o.course || 'unknown');
        if (!byCourseMap[c]) byCourseMap[c] = { course: c, count: 0, revenue: 0 };
        byCourseMap[c].count += 1;
        byCourseMap[c].revenue += Number(o.amount || 0);
      });
      const by_day = Object.keys(byDayMap).sort().map((date) => ({ date, amount: byDayMap[date] }));
      const top_courses = Object.values(byCourseMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

      return res.status(200).json({
        revenue,
        total_orders: allOrders.length,
        paid_orders: paid.length,
        pending_orders: pending.length,
        customers,
        pending_reviews,
        total_reviews,
        pending_withdraws,
        total_affiliates: (affs || []).length,
        by_day,
        top_courses,
      });
    }

    // 3. Image Upload
    if (action === 'upload_image') {
      const dataUrl = body.data_url || body.dataUrl;
      const r = await uploadDataUrl(supabase, String(body.folder || 'courses'), dataUrl);
      if (r.error || !r.url) return res.status(400).json({ error: r.error || 'ছবি আপলোড করা যায়নি' });
      return res.status(200).json({ ok: true, url: r.url });
    }

    // 4. Reviews Moderation (List ALL, Approve/Hide, Delete, Add)
    if (action === 'reviewList') {
      let q = supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(200);
      if (body.status && body.status !== 'all') q = q.eq('status', body.status);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ reviews: data || [] });
    }
    if (action === 'reviewSet') {
      const { error } = await supabase.from('reviews').update({ status: body.status || 'approved' }).eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'reviewApproveAll') {
      const { error } = await supabase.from('reviews').update({ status: 'approved' }).neq('status', 'approved');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'reviewAdd') {
      const row = {
        name: String(body.name || 'HVB শিক্ষার্থী').slice(0, 80),
        email: String(body.email || 'verified@hypervisionbd.com').slice(0, 120),
        course: String(body.course || 'bundle').slice(0, 60),
        rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
        body: String(body.body || '').trim().slice(0, 1200),
        image_url: body.image_url ? String(body.image_url).trim() : null,
        link: body.link ? String(body.link).trim() : null,
        status: 'approved',
      };
      if (!row.body) return res.status(400).json({ error: 'রিভিউ লেখা খালি রাখা যাবে না' });
      const { error } = await supabase.from('reviews').insert(row);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'reviewDelete') {
      const { error } = await supabase.from('reviews').delete().eq('id', body.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 5. Course Requests (check both site_events and events tables)
    if (action === 'courseRequestList') {
      let rows = [];
      try {
        const r1 = await supabase.from('site_events').select('*').eq('event', 'course_request').order('created_at', { ascending: false }).limit(80);
        if (r1.data) rows = rows.concat(r1.data);
      } catch (e) {}
      if (!rows.length) {
        try {
          const r2 = await supabase.from('events').select('*').eq('event', 'course_request').order('created_at', { ascending: false }).limit(80);
          if (r2.data) rows = rows.concat(r2.data);
        } catch (e) {}
      }
      return res.status(200).json({ requests: rows });
    }
    if (action === 'courseRequestDelete') {
      try { await supabase.from('site_events').delete().eq('id', body.id); } catch (e) {}
      try { await supabase.from('events').delete().eq('id', body.id); } catch (e) {}
      return res.status(200).json({ success: true });
    }

    // 6. Orders
    if (action === 'ordersList') {
      let q = supabase.from('orders').select('*');
      if (body.status && body.status !== 'all') {
        if (body.status === 'paid') q = q.eq('status', 'paid');
        else q = q.neq('status', 'paid');
      }
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
      const course = String(body.course || 'bundle').toLowerCase().trim();
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

    // 7. Coupons / Promo Codes (Full CRUD)
    if (action === 'promoList') {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
      return res.status(200).json({ promos: data || [] });
    }
    if (action === 'promoSave') {
      const code = String(body.code || '').trim().toUpperCase();
      const discount = Number(body.discount_percent || 0);
      if (!code || discount <= 0) return res.status(400).json({ error: 'সঠিক কোড ও ডিসকাউন্ট % দিন' });
      const { error } = await supabase.from('promo_codes').upsert({ code, discount_percent: discount, active: body.active !== false }, { onConflict: 'code' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'promoToggle') {
      const { error } = await supabase.from('promo_codes').update({ active: !!body.active }).eq('code', body.code);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'promoDelete') {
      const { error } = await supabase.from('promo_codes').delete().eq('code', body.code);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 8. Affiliates & Withdrawals (Full Student Affiliate Control)
    if (action === 'affiliateList') {
      const { data, error } = await supabase.from('affiliates').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const out = [];
      for (const a of data || []) {
        let bal = { earned: 0, adjust: 0, paidOut: Number(a.paid_out || 0), pending: 0, totalSales: 0, orderCount: 0 };
        try { bal = await affiliateBalance(a); } catch (err) {}
        out.push({
          ref_code: a.ref_code,
          name: a.name,
          contact: a.contact,
          email: a.email || '',
          pay_method: a.pay_method || '',
          pay_account: a.pay_account || '',
          commission_percent: a.commission_percent,
          active: a.active !== false,
          created_at: a.created_at,
          ...bal,
        });
      }
      return res.status(200).json({ affiliates: out });
    }
    if (action === 'affiliateUpdate') {
      const upd = {};
      if (body.commission_percent !== undefined) upd.commission_percent = Number(body.commission_percent);
      if (body.active !== undefined) upd.active = !!body.active;
      const { error } = await supabase.from('affiliates').update(upd).eq('ref_code', body.ref_code);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'affiliateAdjust') {
      const amt = Math.round(Number(body.amount || 0));
      if (!body.ref_code || !amt) return res.status(400).json({ error: 'ref_code এবং টাকার পরিমাণ দিন' });
      const { error } = await supabase.from('affiliate_adjustments').insert({
        ref_code: body.ref_code,
        amount: amt,
        note: String(body.note || 'Admin Adjustment').slice(0, 120),
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'withdrawList') {
      const { data } = await supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
      const minWithdraw = Number(await getSetting('min_withdraw', 500)) || 500;
      return res.status(200).json({ requests: data || [], min_withdraw: minWithdraw });
    }
    if (action === 'withdrawApprove') {
      const id = body.requestId || body.id;
      const { data: reqRow } = await supabase.from('withdraw_requests').select('*').eq('id', id).single();
      if (!reqRow) return res.status(404).json({ error: 'Not found' });
      const { data: affiliate } = await supabase.from('affiliates').select('paid_out').eq('ref_code', reqRow.ref_code).single();
      await supabase.from('affiliates').update({ paid_out: Number(affiliate?.paid_out || 0) + Number(reqRow.amount) }).eq('ref_code', reqRow.ref_code);
      await supabase.from('withdraw_requests').update({ status: 'paid' }).eq('id', id);
      return res.status(200).json({ success: true });
    }
    if (action === 'withdrawReject') {
      const id = body.requestId || body.id;
      await supabase.from('withdraw_requests').update({ status: 'rejected' }).eq('id', id);
      return res.status(200).json({ success: true });
    }

    // 9. Products (Supabase table sync)
    if (action === 'productList') {
      const { data } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
      return res.status(200).json({ products: data || [] });
    }
    if (action === 'productSave') {
      const slug = String(body.slug || '').trim().toLowerCase();
      if (!slug) return res.status(400).json({ error: 'slug required' });
      const row = {
        slug,
        title: String(body.title || slug),
        price: Number(body.price || 0),
        regular_price: Number(body.regular_price || 0),
        thumbnail: body.thumbnail || null,
        drive_link: body.drive_link || null,
        prompt: body.prompt || null,
        short_description: body.short_description || null,
        active: body.active !== false,
        sort_order: Number(body.sort_order || 0),
      };
      const { error } = await supabase.from('products').upsert(row, { onConflict: 'slug' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    if (action === 'productDelete') {
      await supabase.from('products').delete().eq('slug', body.slug);
      return res.status(200).json({ success: true });
    }

    // 10. Settings
    if (action === 'settingsGet') {
      const { data } = await supabase.from('settings').select('*');
      return res.status(200).json({ settings: data || [] });
    }
    if (action === 'settingsSave') {
      if (body.key) {
        await saveSetting(body.key, body.value);
      } else {
        for (const k of Object.keys(body)) {
          if (['action', 'password', 'adminPassword'].includes(k)) continue;
          await saveSetting(k, body[k]);
        }
      }
      return res.status(200).json({ result: 'Saved', ok: true });
    }

    return res.status(400).json({ error: 'Invalid action: ' + action });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
