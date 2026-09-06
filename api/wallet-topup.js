const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function extractInvoiceId(zpData) {
  if (zpData && zpData.invoice_id) return zpData.invoice_id;
  const url = zpData && zpData.payment_url;
  if (!url) return null;
  const parts = String(url).split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { email, amount } = req.body;
    if (!email || !amount || isNaN(amount) || amount < 10) return res.status(400).json({ error: "Invalid amount or email" });

    const cleanEmail = String(email).toLowerCase().trim();
    const ourRef = crypto.randomUUID();
    
    const fallbackUrl = req.headers.origin || ("https://" + (req.headers.host || "hvb1.vercel.app"));
    const siteUrl = (process.env.SITE_URL || fallbackUrl).replace(/\/$/, "");
    
    const zpRes = await fetch("https://api.zinipay.com/v1/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "zini-api-key": process.env.ZINIPAY_API_KEY,
      },
      body: JSON.stringify({
        amount,
        cus_name: "Wallet User",
        cus_email: cleanEmail,
        cus_phone: "01000000000",
        metadata: { our_ref: ourRef, course: "wallet_topup", email: cleanEmail },
        redirect_url: `${siteUrl}/my-courses?wallet_success=1`,
        success_url: `${siteUrl}/my-courses?wallet_success=1`,
        cancel_url: `${siteUrl}/my-courses?wallet_cancel=1`,
        webhook_url: `${siteUrl}/api/zinipay-webhook`,
      }),
    });

    const zpData = await zpRes.json();
    if (!zpRes.ok || !zpData.payment_url) {
      return res.status(502).json({ error: "Payment gateway error", details: zpData });
    }
    const invoiceId = extractInvoiceId(zpData);

    let insertPayload = {
      customer_name: "Wallet Topup",
      customer_contact: cleanEmail,
      course: "wallet_topup",
      amount,
      invoice_id: invoiceId,
      our_ref: ourRef,
      status: "pending"
    };

    let { error: insertErr } = await supabase.from("orders").insert(insertPayload);
    if (insertErr && insertErr.code === "PGRST204") {
      delete insertPayload.invoice_id;
      delete insertPayload.our_ref;
      const retry = await supabase.from("orders").insert(insertPayload);
      insertErr = retry.error;
    }
    if (insertErr) return res.status(500).json({ error: "Database error: " + insertErr.message });

    return res.status(200).json({ payment_url: zpData.payment_url });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

