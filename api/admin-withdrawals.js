// /api/admin-withdrawals.js
// শুধু আপনি (Admin) ব্যবহার করবেন — সব Withdraw রিকোয়েস্ট দেখা ও Approve করা

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { adminPassword, action, requestId } = req.body;

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'ভুল Admin পাসওয়ার্ড' });
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ requests: data || [] });
    }

    if (action === 'approve') {
      if (!requestId) return res.status(400).json({ error: 'requestId দিন' });

      const { data: reqRow, error: reqErr } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqErr || !reqRow) return res.status(404).json({ error: 'রিকোয়েস্ট খুঁজে পাওয়া যায়নি' });

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('paid_out')
        .eq('ref_code', reqRow.ref_code)
        .single();

      const newPaidOut = Number(affiliate?.paid_out || 0) + Number(reqRow.amount);

      await supabase.from('affiliates').update({ paid_out: newPaidOut }).eq('ref_code', reqRow.ref_code);
      await supabase.from('withdraw_requests').update({ status: 'paid' }).eq('id', requestId);

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
