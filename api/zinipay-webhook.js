// /api/zinipay-webhook.js
// ShohojPay অটো-ভেরিফাই পেমেন্ট সফল হলে এই Webhook-এ কল করবে এবং সাথে সাথেই কোর্স আনলক হয়ে যাবে।

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const orderId = body.order_id || body.orderId || body.our_ref || query.order_id || null;
    const invoiceId = body.invoice_id || body.invoiceId || body.payment_id || query.invoice_id || null;
    const trxId = body.transaction_id || body.trx_id || body.trxId || null;
    const payMethod = body.payment_method || body.method || body.gateway || "ShohojPay";
    const rawStatus = String(body.status || query.status || "completed").toUpperCase();

    if (!orderId && !invoiceId) {
      return res.status(200).json({ received: true, note: "no order_id or invoice_id" });
    }

    if (rawStatus === "FAILED" || rawStatus === "CANCELLED" || rawStatus === "REJECTED") {
      if (orderId) {
        await supabase.from("orders").update({ status: "failed" }).eq("our_ref", orderId);
      } else if (invoiceId) {
        await supabase.from("orders").update({ status: "failed" }).eq("invoice_id", invoiceId);
      }
      return res.status(200).json({ received: true, marked: "failed" });
    }

    const isPaid =
      rawStatus === "COMPLETED" ||
      rawStatus === "PAID" ||
      rawStatus === "SUCCESS" ||
      rawStatus === "VERIFIED" ||
      rawStatus === "APPROVED" ||
      rawStatus === "TRUE" ||
      rawStatus === "1";

    if (isPaid) {
      let updateQuery = supabase
        .from("orders")
        .update({
          status: "paid",
          transaction_id: trxId,
          payment_method: payMethod,
        });

      if (orderId && invoiceId) {
        updateQuery = updateQuery.or(`our_ref.eq.${orderId},invoice_id.eq.${invoiceId}`);
      } else if (orderId) {
        updateQuery = updateQuery.eq("our_ref", orderId);
      } else {
        updateQuery = updateQuery.eq("invoice_id", invoiceId);
      }

      const { data: updatedRows, error } = await updateQuery.select("*");
      if (error) console.error("order update error:", error);

      const orderData = updatedRows && updatedRows[0] ? updatedRows[0] : null;

      // Auto-Email Delivery (if Resend is configured)
      if (process.env.RESEND_API_KEY && orderData && orderData.course !== "wallet_topup") {
        try {
          const { Resend } = require("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const userEmail = orderData.linked_email || orderData.customer_contact;
          const userName = orderData.customer_name || "Customer";

          if (userEmail && String(userEmail).includes("@")) {
            await resend.emails.send({
              from: "HVB <onboarding@resend.dev>",
              to: userEmail,
              subject: "HVB-এ আপনার কোর্সটি সফলভাবে চালু হয়েছে!",
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1421; color: #ffffff; padding: 30px; border-radius: 12px;">
                <h2 style="color: #00E5FF; text-align: center;">Hyper Vision Bangla-তে স্বাগতম!</h2>
                <p style="font-size: 16px; color: #eaf0ff;">হ্যালো ${userName},</p>
                <p style="font-size: 16px; color: #eaf0ff;">আপনার পেমেন্টটি সফলভাবে ভেরিফাই হয়েছে এবং আপনার কোর্সটি এখন সম্পূর্ণ চালু!</p>
                <div style="background: #161d2e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #212a42;">
                  <p style="margin: 5px 0; color: #9aa5bf;">অর্ডার আইডি: <span style="color: #ffffff;">${orderId || invoiceId}</span></p>
                  <p style="margin: 5px 0; color: #9aa5bf;">TrxID: <span style="color: #ffffff;">${trxId || "Verified"}</span></p>
                  <p style="margin: 5px 0; color: #9aa5bf;">স্ট্যাটাস: <strong style="color: #4FE3C1;">Paid</strong></p>
                </div>
                <a href="https://hypervisionbd.com/my-courses" style="display: block; width: 100%; text-align: center; background-color: #00E5FF; color: #000000; padding: 15px 0; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 30px 0;">কোর্স শুরু করুন</a>
              </div>
              `,
            });
          }
        } catch (e) {
          console.error("Email Error:", e);
        }
      }

      return res.status(200).json({ received: true, marked: "paid", order: orderId || invoiceId });
    }

    return res.status(200).json({ received: true, marked: "pending" });
  } catch (err) {
    console.error("ShohojPay Webhook error:", err);
    return res.status(200).json({ received: true });
  }
};
