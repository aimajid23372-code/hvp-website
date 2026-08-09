// /api/admin-analytics.js — শুধু Admin: সাইটের পুরো হিস্ট্রি ও পরিসংখ্যান।
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function daysAgoISO(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { adminPassword, days } = req.body || {};
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'ভুল Admin পাসওয়ার্ড' });
    }

    const range = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);
    const since = daysAgoISO(range);

    const { data: events, error } = await supabase
      .from('site_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) return res.status(500).json({ error: error.message });

    const rows = events || [];

    const byDay = {};
    const visitorsByDay = {};
    const pages = {};
    const refs = {};
    const visitors = {};

    rows.forEach(function (r) {
      const day = String(r.created_at).slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
      visitorsByDay[day] = visitorsByDay[day] || {};
      visitorsByDay[day][r.visitor_id] = 1;

      if (r.event === 'pageview') pages[r.page] = (pages[r.page] || 0) + 1;
      if (r.ref_code) refs[r.ref_code] = (refs[r.ref_code] || 0) + 1;

      const v = (visitors[r.visitor_id] = visitors[r.visitor_id] || {
        visitor_id: r.visitor_id,
        visits: 0,
        first: r.created_at,
        last: r.created_at,
        ref_code: r.ref_code || '',
        payment_click: 0,
        pages: {},
      });
      v.visits++;
      if (r.created_at < v.first) v.first = r.created_at;
      if (r.created_at > v.last) v.last = r.created_at;
      if (r.ref_code && !v.ref_code) v.ref_code = r.ref_code;
      if (r.event === 'payment_click') v.payment_click++;
      v.pages[r.page] = (v.pages[r.page] || 0) + 1;
    });

    const daily = Object.keys(byDay)
      .sort()
      .map(function (d) {
        return { day: d, hits: byDay[d], visitors: Object.keys(visitorsByDay[d]).length };
      });

    const topPages = Object.keys(pages)
      .map(function (p) {
        return { page: p, hits: pages[p] };
      })
      .sort(function (a, b) {
        return b.hits - a.hits;
      })
      .slice(0, 15);

    const topRefs = Object.keys(refs)
      .map(function (r) {
        return { ref_code: r, hits: refs[r] };
      })
      .sort(function (a, b) {
        return b.hits - a.hits;
      })
      .slice(0, 15);

    const visitorList = Object.keys(visitors)
      .map(function (k) {
        const v = visitors[k];
        v.top_page = Object.keys(v.pages).sort(function (a, b) {
          return v.pages[b] - v.pages[a];
        })[0];
        delete v.pages;
        return v;
      })
      .sort(function (a, b) {
        return a.last < b.last ? 1 : -1;
      })
      .slice(0, 200);

    const { data: orders } = await supabase
      .from('orders')
      .select('our_ref, course, status, customer_contact, customer_name, affiliate_ref, amount, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(300);

    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('name, ref_code, contact, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    const paid = (orders || []).filter(function (o) {
      return o.status === 'paid';
    });

    return res.status(200).json({
      range,
      summary: {
        total_hits: rows.length,
        unique_visitors: Object.keys(visitors).length,
        payment_clicks: rows.filter(function (r) {
          return r.event === 'payment_click';
        }).length,
        orders_total: (orders || []).length,
        orders_paid: paid.length,
        affiliates_total: (affiliates || []).length,
      },
      daily,
      topPages,
      topRefs,
      visitors: visitorList,
      orders: orders || [],
      affiliates: affiliates || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
