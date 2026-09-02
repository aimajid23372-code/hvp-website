// /api/create-invoice.js
// কাজ: promo code চেক করে, ZiniPay-তে invoice বানায়, নিজস্ব reference (our_ref)
// তৈরি করে এবং পেমেন্ট শেষে সরাসরি my-courses.html পেজে ফেরত পাঠায়।

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSES = {
  bundle: { title: 'Long + Short Video Course', amount: 650 },
  short: { title: 'Short Video Course', amount: 299 },
};

// payment_url থেকে invoice id বের করা (ZiniPay create-এ শুধু payment_url দেয়)
function extractInvoiceId(zpData) {
  if (zpData && zpData.invoice_id) return zpData.invoice_id;
  const url = zpData && zpData.payment_url;
  if (!url) return null;
  const parts = String(url).split('?')[0].split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

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
    if (!name || !contact) {
      return res.status(400).json({ error: 'নাম ও যোগাযোগ নাম্বার/ইমেইল দিন' });
    }

    let amount = courseInfo.amount;

    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (promo) {
        amount = Math.round(amount - (amount * promo.discount_percent) / 100);
      }
    }

    const cleanContact = String(contact).trim();
    const isEmail = cleanContact.includes('@');
    const cus_email = isEmail ? cleanContact.toLowerCase() : 'student@hvb.com';
    const cus_phone = isEmail ? '01000000000' : cleanContact.replace(/[^0-9]/g, '');

    const ourRef = crypto.randomUUID();
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/, '');

    // পেমেন্ট সফল হলে সরাসরি কোর্স পেজে ফেরত — order=<our_ref>
    const redirectUrl = `${siteUrl}/my-courses?order=${ourRef}`;
    const cancelUrl = `${siteUrl}/${course === 'short' ? 'course-short.html' : 'course-bundle.html'}?cancelled=1`;

    const zpRes = await fetch('https://api.zinipay.com/v1/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({
        amount,
        cus_name: name,
        cus_email,
        cus_phone,
        metadata: { our_ref: ourRef, course },
        // ZiniPay ডকুমেন্টেশন অনুযায়ী সঠিক নাম redirect_url (আগে success_url দেওয়া ছিল — ভুল)
        redirect_url: redirectUrl,
        success_url: redirectUrl,
        cancel_url: cancelUrl,
        webhook_url: `${siteUrl}/api/zinipay-webhook`,
      }),
    });

    const zpData = await zpRes.json();

    if (!zpRes.ok || !zpData.payment_url) {
      console.error('ZiniPay rejected the request:', zpRes.status, JSON.stringify(zpData));
      return res.status(502).json({ error: 'Payment gateway error', details: zpData });
    }

    const invoiceId = extractInvoiceId(zpData);

    const { error: insertErr } = await supabase.from('orders').insert({
      customer_name: name,
      customer_contact: cleanContact,
      course,
      amount,
      promo_code: promoCode || null,
      affiliate_ref: ref || null,
      invoice_id: invoiceId,
      our_ref: ourRef,
      status: 'pending',
    });

    if (insertErr) {
      console.error('Order insert error:', insertErr);
      return res.status(500).json({ error: 'ডাটাবেসে সমস্যা: ' + insertErr.message });
    }

    return res.status(200).json({ payment_url: zpData.payment_url, order: ourRef });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
