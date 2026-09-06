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
    if (action !== 'settingsGet' && (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (action === 'auth') return res.status(200).json({ ok: true });

    // Orders search/verify
    if (action === 'search') {
      const q = String(body.query || '').trim();
      let sel = supabase.from('orders').select('*');
      if (q) {
        if (q.includes('@')) sel = sel.ilike('customer_contact', '%' + q.toLowerCase() + '%');
        else if (/^[0-9\s+\-]+$/.test(q)) sel = sel.ilike('customer_contact', '%' + q.replace(/[^0-9]/g, '').slice(-10) + '%');
        else sel = sel.or(\our_ref.eq.\,invoice_id.eq.\\);
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

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

