// /api/zinipay-webhook.js
// ZiniPay পেমেন্ট সফল হলে এখানে কল করে: { invoice_id, status: "true" }
// লক্ষ্য: কেউ টাকা দিলে সাথে সাথেই কোর্স খুলে যাবে — কোনো ম্যানুয়াল অনুমোদন লাগবে না।
// নিরাপত্তা: প্রথমে ZiniPay-তে verify করা হয়। verify সাময়িকভাবে না পাওয়া গেলেও
// callback-টি ZiniPay শুধু সফল পেমেন্টেই পাঠায়, তাই ওই invoice_id-র pending অর্ডারটি paid করা হয়।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyWithZiniPay(invoiceId) {
  try {
    const r = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('verify failed:', r.status, JSON.stringify(data));
      return null;
    }
    return data;
  } catch (err) {
    console.error('verify error:', err);
    return null;
  }
}

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const invoiceId = body.invoice_id || query.invoice_id || body.invoiceId || query.invoiceId;
    const rawStatus = String(body.status || query.status || '').toUpperCase();

    if (!invoiceId) {
      return res.status(200).json({ received: true, note: 'no invoice_id' });
    }

    const verified = await verifyWithZiniPay(invoiceId);
    const vStatus = String((verified && verified.status) || '').toUpperCase();
    const callbackOk = rawStatus === 'TRUE' || rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === '1';

    if (vStatus === 'FAILED') {
      await supabase.from('orders').update({ status: 'failed' }).eq('invoice_id', invoiceId);
      return res.status(200).json({ received: true, marked: 'failed' });
    }

    if (vStatus === 'COMPLETED' || callbackOk) {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          transaction_id: (verified && verified.transaction_id) || null,
          payment_method: (verified && verified.payment_method) || null,
        })
        .eq('invoice_id', invoiceId);
      if (error) console.error('order update error:', error);
      
      // Auto-Email Delivery
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const { data: orderData } = await supabase.from('orders').select('*').eq('invoice_id', invoiceId).single();
          
          if (orderData && orderData.c_email) {
            await resend.emails.send({
              from: 'HVB <onboarding@resend.dev>', // Should be a verified domain like info@hypervisionbangla.com
              to: orderData.c_email,
              subject: 'HVB কোর্সে আপনাকে স্বাগতম! 🎉',
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1421; color: #ffffff; padding: 30px; border-radius: 12px;">
                <h2 style="color: #4FE3C1; text-align: center;">HVB-তে স্বাগতম! 🎉</h2>
                <p style="font-size: 16px; color: #eaf0ff;">হ্যালো ${orderData.c_name || 'Customer'},</p>
                <p style="font-size: 16px; color: #eaf0ff;">আপনার পেমেন্ট সফলভাবে রিসিভ হয়েছে। HVB এর সাথে যুক্ত হওয়ার জন্য আপনাকে অসংখ্য ধন্যবাদ!</p>
                <div style="background: #161d2e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #212a42;">
                  <h3 style="margin-top: 0; color: #9B8CFF;">কোর্সের বিস্তারিত:</h3>
                  <p style="margin: 5px 0; color: #9aa5bf;">অর্ডার আইডি: <span style="color: #ffffff;">${invoiceId}</span></p>
                  <p style="margin: 5px 0; color: #9aa5bf;">স্ট্যাটাস: <strong style="color: #4FE3C1;">Paid</strong></p>
                </div>
                <p style="font-size: 16px; color: #eaf0ff;">আপনার কোর্সটি এখন আনলক হয়ে গেছে। ওয়েবসাইটে গিয়ে <strong>My Courses</strong> সেকশন থেকে আপনি এখনই কোর্স দেখা শুরু করতে পারেন।</p>
                <a href="https://hvb1.vercel.app/my-courses" style="display: block; width: 100%; text-align: center; background-color: #4FE3C1; color: #000000; padding: 15px 0; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 30px 0;">কোর্স শুরু করুন</a>
                <p style="font-size: 14px; color: #9aa5bf; text-align: center;">যেকোনো সমস্যায় আমাদের ফেসবুক পেইজে মেসেজ দিন।<br>Happy Learning! 🚀</p>
              </div>
              `
            });
          }
        } catch(e) { console.error('Email Error:', e); }
      }

      return res.status(200).json({ received: true, marked: 'paid' });
    }

    return res.status(200).json({ received: true, marked: 'pending' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ received: true });
  }
};
