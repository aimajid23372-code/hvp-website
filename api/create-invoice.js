// /api/create-invoice.js
// Vercel-এ /api/create-invoice নামে একটা এন্ডপয়েন্ট হয়ে যাবে
// কাজ: promo code চেক করে, ZiniPay-তে invoice বানায়, এবং একটা নিজস্ব
// reference (ourRef) তৈরি করে যাতে কাস্টমার পেমেন্ট সফল হয়ে ফিরে এলে
// ঠিক সেই অর্ডারটাই চেক করা যায় — বাতিল করলে কিছুই দেখাবে না

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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
    const { course, name, contact, promoCode, ref, returnUrl } = req.body;

    const courseInfo = COURSES[course];
    if (!courseInfo) {
      return res.status(400).json({ error: 'Invalid course' });
    }

    let amount = courseInfo.amount;

    // প্রোমো কোড চেক করা (থাকলে)
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

    // ZiniPay-এর cus_email ও cus_phone দুটোই লাগে — ইউজার email/phone
    // যেটাই দিক না কেন, এখান থেকে দুটো field-ই ভরে দিচ্ছি
    const isEmail = contact.includes('@');
    const cus_email = isEmail ? contact : 'student@hvb.com';
    const cus_phone = isEmail ? '01000000000' : contact;

    // নিজস্ব reference — পেমেন্ট সফল হয়ে ফিরে এলে এটা দিয়েই অর্ডার খুঁজে বের করবো
    const ourRef = crypto.randomUUID();
    const successUrl = returnUrl ? `${returnUrl}?ref=${ourRef}` : process.env.SITE_URL;
    // cancel_url-এ কোনো ref নেই — তাই বাতিল করে ফিরে এলে সাইট একদম স্বাভাবিক থাকবে
    const cancelUrl = returnUrl || process.env.SITE_URL;

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
        success_url: successUrl,
        cancel_url: cancelUrl,
        webhook_url: `${process.env.SITE_URL}/api/zinipay-webhook`,
      }),
    });

    const zpData = await zpRes.json();

    if (!zpRes.ok) {
      console.error('ZiniPay rejected the request:', zpRes.status, JSON.stringify(zpData));
      return res.status(502).json({ error: 'Payment gateway error', details: zpData });
    }

    // pending অর্ডার Supabase-এ সেভ করা, আমাদের নিজের ref সহ
    await supabase.from('orders').insert({
      customer_name: name,
      customer_contact: contact,
      course,
      amount,
      promo_code: promoCode || null,
      affiliate_ref: ref || null,
      invoice_id: zpData.invoice_id,
      our_ref: ourRef,
      status: 'pending',
    });

    return res.status(200).json({ payment_url: zpData.payment_url });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
