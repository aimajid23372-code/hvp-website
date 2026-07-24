// /api/create-invoice.js
// Vercel-এ /api/create-invoice নামে একটা এন্ডপয়েন্ট হয়ে যাবে
// কাজ: promo code চেক করে, ZiniPay-তে invoice বানায়, এবং একটা নিজস্ব
// reference (ourRef) তৈরি করে যাতে কাস্টমার পেমেন্ট থেকে ফিরে এলে
// ঠিক সেই অর্ডারটাই চেক করা যায় (localStorage-এর দরকার নেই)

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

    // নিজস্ব reference — এটা দিয়েই পরে কাস্টমার ফিরে এলে অর্ডার খুঁজে বের করবো
    const ourRef = crypto.randomUUID();
    const finalReturnUrl = returnUrl ? `${returnUrl}?ref=${ourRef}` : undefined;

    // ⚠️ NOTE: নিচের ZiniPay endpoint/field নামগুলো তাদের পাবলিক ডকুমেন্টেশন
    // অনুযায়ী আন্দাজ করা। আসল API Key দিয়ে টেস্ট করার সময় ZiniPay Dashboard
    // -> API Docs -এর "Create Invoice" অংশের সাথে মিলিয়ে নিতে হতে পারে।
    const zpRes = await fetch('https://api.zinipay.com/v1/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({
        amount,
        cus_name: name,
        cus_email: contact,
        webhook_url: `${process.env.SITE_URL}/api/zinipay-webhook`,
        return_url: finalReturnUrl,
      }),
    });

    const zpData = await zpRes.json();

    if (!zpRes.ok) {
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
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
