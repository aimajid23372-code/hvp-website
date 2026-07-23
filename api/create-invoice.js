const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSES = {
  bundle: { title: 'Long + Short Video Course', amount: 950 },
  short: { title: 'Short Video Course', amount: 499 },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course, name, contact, promoCode, ref } = req.body;

    const courseInfo = COURSES[course];
    if (!courseInfo) {
      return res.status(400).json({ error: 'Invalid course' });
    }

    let amount = courseInfo.amount;

    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .single();

      if (promo) {
        amount = Math.round(amount - (amount * promo.discount_percent) / 100);
      }
    }

    // Email or Phone validation
    const isEmail = contact.includes('@');
    const cus_email = isEmail ? contact : 'student@hvb.com';
    const cus_phone = isEmail ? '01000000000' : contact;

    // ZiniPay Request (with cancel_url and success_url added)
    const zpRes = await fetch('https://api.zinipay.com/v1/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({
        amount,
        cus_name: name,
        cus_email: cus_email,
        cus_phone: cus_phone,
        success_url: process.env.SITE_URL, 
        cancel_url: process.env.SITE_URL,
        webhook_url: `${process.env.SITE_URL}/api/zinipay-webhook`,
      }),
    });

    const zpData = await zpRes.json();

    if (!zpRes.ok) {
      console.error("=== ZINIPAY REJECTED THE PAYMENT ===");
      console.error("Error Status:", zpRes.status);
      console.error("ZiniPay Response:", JSON.stringify(zpData));
      return res.status(502).json({ error: 'Payment gateway error', details: zpData });
    }

    await supabase.from('orders').insert({
      customer_name: name,
      customer_contact: contact,
      course,
      amount,
      promo_code: promoCode || null,
      affiliate_ref: ref || null,
      invoice_id: zpData.invoice_id,
      status: 'pending',
    });

    return res.status(200).json({ payment_url: zpData.payment_url, invoice_id: zpData.invoice_id });
  } catch (err) {
    console.error("=== SERVER ERROR ===", err);
    return res.status(500).json({ error: 'Server error' });
  }
};
