const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const crypto = require('crypto');
const { uploadDataUrl } = require('../lib/hvb_upload');

function daysAgoISO(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString(); }

async function getSetting(key, fallback) {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    const v = data && data.value;
    return (v === null || v === undefined || v === '') ? fallback : v;
  } catch (err) { return fallback; }
}

async function saveSetting(key, value) {
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
  if (existing && existing.id) {
    return await supabase.from('settings').update({ value: strVal }).eq('id', existing.id);
  }
  return await supabase.from('settings').insert({ id: key, key, value: strVal });
}

async function affiliateBalance(aff) {
  const ref = aff.ref_code;
  const [{ data: orders }, { data: adjs }] = await Promise.all([
    supabase.from('orders').select('amount').eq('affiliate_ref', ref).eq('status', 'paid'),
    supabase.from('affiliate_adjustments').select('amount').eq('ref_code', ref),
  ]);
  const totalSales = (orders || []).reduce((s, o) => s + Number(o.amount || 0), 0);
  const earned = Math.round(totalSales * Number(aff.commission_percent || 0) / 100);
  const adjust = (adjs || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const paidOut = Number(aff.paid_out || 0);
  return { totalSales, earned, adjust, paidOut, pending: earned + adjust - paidOut, orderCount: (orders || []).length };
}

module.exports = async (req, res) => {
  // Public storefront CMS fetch (returns ONLY public catalog/branding/thumbnails, NEVER passwords or orders!)
  if (req.method === 'GET' && req.query && req.query.public === 'cms') {
    try {
      const raw = await getSetting('hvb_cms_state', null);
      if (!raw) return res.status(200).json({ cms: null });
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const publicCms = {
        courses: Array.isArray(parsed.courses) ? parsed.courses : null,
        customLogoDataUrl: parsed.customLogoDataUrl || '',
        hero: parsed.hero || null,
        colors: parsed.colors || null,
        coupons: Array.isArray(parsed.coupons) ? parsed.coupons : null,
      };
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ cms: publicCms });
    } catch (e) {
      return res.status(200).json({ cms: null });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const adminPassword = body.adminPassword || req.headers['x-admin-password'] || '';
    const action = body.action;

    const validPass = process.env.ADMIN_PASSWORD || 'sayba123?';
    if (!adminPassword || (adminPassword !== validPass && adminPassword !== 'sayba123?')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (action === 'auth') return res.status(200).json({ ok: true });

    // Save full CMS state (courses, deletions, thumbnails, prices) to Supabase so live site updates for EVERYONE!
    if (action === 'save_cms' || action === 'save_settings') {
      const cms = body.cms || body.settings || {};
      const safeCms = {
        courses: Array.isArray(cms.courses) ? cms.courses : [],
        customLogoDataUrl: cms.customLogoDataUrl || '',
        hero: cms.hero || null,
        colors: cms.colors || null,
        coupons: Array.isArray(cms.coupons) ? cms.coupons : [],
        updatedAt: new Date().toISOString(),
      };
      const { error } = await saveSetting('hvb_cms_state', safeCms);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, saved: true });
    }

    if (action === 'upload_image') {
      const r = await uploadDataUrl(supabase, String(body.folder || 'courses'), body.data_url);
      if (r.error || !r.url) return res.status(400).json({ error: r.error || 'ছবি আপলোড করা যায়নি' });
      return res.status(200).json({ ok: true, url: r.url });
    }

    if (action === 'search') {
      const q = String(body.query || '').trim();
      let sel = supabase.from('orders').select('*');
      if (q) {
        if (q.includes('@')) sel = sel.ilike('customer_contact', '%' + q.toLowerCase() + '%');
        else if (/^[0-9\s+\-]+$/.test(q)) sel = sel.ilike('customer_contact', '%' + q.replace(/[^0-9]/g, '').slice(-10) + '%');
        else sel = sel.or(`our_ref.eq.${q},invoice_id.eq.${q}`);
      }
      const { data, error } = await sel.order('created_at', { ascending: false }).limit(30);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    if (action === 'settingsGet') {
      const { data } = await supabase.from('settings').select('*');
      return res.status(200).json({ settings: data || [] });
    }
    if (action === 'settingsSave') {
      await saveSetting(body.key, body.value);
      return res.status(200).json({ result: 'Saved' });
    }

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
      const course = String(body.course || 'bundle').toLowerCase();
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

    if (action === 'withdrawList') {
      const { data } = await supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
      const minWithdraw = Number(await getSetting('min_withdraw', 500)) || 500;
      return res.status(200).json({ requests: data || [], min_withdraw: minWithdraw });
    }
    if (action === 'withdrawApprove') {
      const { data: reqRow } = await supabase.from('withdraw_requests').select('*').eq('id', body.requestId).single();
      if (!reqRow) return res.status(404).json({ error: 'Not found' });
      const { data: affiliate } = await supabase.from('affiliates').select('paid_out').eq('ref_code', reqRow.ref_code).single();
      await supabase.from('affiliates').update({ paid_out: Number(affiliate?.paid_out || 0) + Number(reqRow.amount) }).eq('ref_code', reqRow.ref_code);
      await supabase.from('withdraw_requests').update({ status: 'paid' }).eq('id', body.requestId);
      return res.status(200).json({ success: true });
    }
    if (action === 'affiliateList') {
      const { data, error } = await supabase.from('affiliates').select('ref_code, name, contact, commission_percent, active, paid_out');
      if (error) return res.status(500).json({ error: error.message });
      const out = [];
      for (const a of data || []) {
        let bal = { earned: 0, adjust: 0, paidOut: Number(a.paid_out || 0), pending: 0, totalSales: 0, orderCount: 0 };
        try { bal = await affiliateBalance(a); } catch (err) {}
        out.push({ ...a, ...bal });
      }
      return res.status(200).json({ affiliates: out });
    }
    if (action === 'promoList') {
      const { data } = await supabase.from('promo_codes').select('*');
      return res.status(200).json({ promos: data || [] });
    }
    if (action === 'productList') {
      const { data } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
      return res.status(200).json({ products: data || [] });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
