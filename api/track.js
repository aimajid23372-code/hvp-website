// /api/track.js — ভিজিটরের কার্যকলাপ site_events টেবিলে জমা রাখে।
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const event = String(body.event || 'pageview').slice(0, 40);
    if (event === 'products_get') {
      const { data, error } = await supabase
        .from('products')
        .select('slug,title,price,regular_price,short_description,description,thumbnail,featured,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) return res.status(200).json({ products: [], error: error.message });
      return res.status(200).json({ products: data || [] });
    }
    if (event === 'settings_get') {
      const allow = ['home_slides','home_hero_title','home_hero_subtitle','home_cta_label','home_hero_image','home_show_courses','home_show_reviews','home_show_faq','announcement','announcement_enabled','site_name','tagline','logo_url','favicon_url','messenger_link','facebook_link','tiktok_link','support_email','theme_template','color_primary','color_secondary','color_background','color_surface','course_heading_label','course_cta_label','course_trust_text','course_delivery_note','course_show_description','course_show_reviews','course_show_related','footer_text','support_label','faq_heading','refund_summary','seo_home_title','seo_home_description','faq_1_q','faq_1_a','faq_2_q','faq_2_a','faq_3_q','faq_3_a','faq_4_q','faq_4_a'];
      const { data } = await supabase.from('settings').select('key, value');
      const out = {};
      (data || []).forEach((s2) => { if (allow.includes(s2.key)) out[s2.key] = s2.value; });
      return res.status(200).json({ settings: out });
    }
    const page = String(body.page || '/').slice(0, 200);
    const visitorId = String(body.visitor_id || '').slice(0, 60);
    const refCode = String(body.ref_code || '').slice(0, 40) || null;
    const referrer = String(body.referrer || '').slice(0, 300) || null;

    if (!visitorId) return res.status(200).json({ ok: true });

    const ipRaw = req.headers['x-forwarded-for'] || '';
    const ip = String(ipRaw).split(',')[0].trim().slice(0, 60) || null;
    const ua = String(req.headers['user-agent'] || '').slice(0, 300) || null;

    const { error: insErr } = await supabase.from('site_events').insert({
      event,
      page,
      visitor_id: visitorId,
      ref_code: refCode,
      referrer,
      ip,
      user_agent: ua,
      meta: body.meta || null,
    });

    if (insErr) console.error('track insert error:', insErr.message);
    const { data: settingsData } = await supabase.from('settings').select('*');
    return res.status(200).json({ ok: true, stored: !insErr, settings: settingsData || [] });
  } catch (err) {
    console.error('track error:', err);
    return res.status(200).json({ ok: true });
  }
};
