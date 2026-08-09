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
    const page = String(body.page || '/').slice(0, 200);
    const visitorId = String(body.visitor_id || '').slice(0, 60);
    const refCode = String(body.ref_code || '').slice(0, 40) || null;
    const referrer = String(body.referrer || '').slice(0, 300) || null;

    if (!visitorId) return res.status(200).json({ ok: true });

    const ipRaw = req.headers['x-forwarded-for'] || '';
    const ip = String(ipRaw).split(',')[0].trim().slice(0, 60) || null;
    const ua = String(req.headers['user-agent'] || '').slice(0, 300) || null;

    await supabase.from('site_events').insert({
      event,
      page,
      visitor_id: visitorId,
      ref_code: refCode,
      referrer,
      ip,
      user_agent: ua,
      meta: body.meta || null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track error:', err);
    return res.status(200).json({ ok: true });
  }
};
