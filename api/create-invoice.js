const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSES = { bundle: { amount: 650 }, short: { amount: 299 } };

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
    const { action, promoCode } = req.body;
    
    if (action === 'checkPromo') {
      if (!promoCode) return res.status(200).json({ valid: false });
      const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', String(promoCode).toUpperCase()).eq('active', true).maybeSingle();
      if (promo) return res.status(200).json({ valid: true, discount: promo.discount_percent });
      return res.status(200).json({ valid: false });
    }

    const { course, name, contact, ref } = req.body;
    if (!COURSES[course] || !name || !contact) return res.status(400).json({ error: "Missing information" });

    const { data: sData } = await supabase.from("settings").select("*");
    let settings = {};
    if (sData) sData.forEach(s => settings[s.key] = s.value);
    
    let baseAmount = COURSES[course].amount;
    if (course === "short") baseAmount = parseInt(settings.price_short) || 299;
    if (course === "bundle") baseAmount = parseInt(settings.price_bundle) || 650;

    let amount = baseAmount;
    if (promoCode) {
      const { data: promo } = await supabase.from("promo_codes").select("*").eq("code", String(promoCode).toUpperCase()).eq("active", true).maybeSingle();
      if (promo) amount = Math.round(amount - (amount * promo.discount_percent) / 100);
    }

    const cleanContact = String(contact).trim();
    const isEmail = cleanContact.includes("@");
    const cus_email = isEmail ? cleanContact : "no-email@hvb.com";
    const cus_phone = isEmail ? "01000000000" : cleanContact;
    const ourRef = crypto.randomUUID();
    const fallbackUrl = req.headers.origin || ("https://" + (req.headers.host || "hvb1.vercel.app"));
    const siteUrl = (process.env.SITE_URL || fallbackUrl).replace(/\/$/, "");

    const zpRes = await fetch("https://api.zinipay.com/v1/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "zini-api-key": process.env.ZINIPAY_API_KEY },
      body: JSON.stringify({
        amount, cus_name: name, cus_email, cus_phone, metadata: { our_ref: ourRef, course },
        redirect_url: siteUrl + "/my-courses",
        success_url: siteUrl + "/my-courses",
        cancel_url: siteUrl + "/course-" + course,
        webhook_url: siteUrl + "/api/zinipay-webhook",
      }),
    });

    const zpData = await zpRes.json();
    if (!zpRes.ok || !zpData.payment_url) {
      return res.status(502).json({ error: "Payment gateway error. Please try again later." });
    }

    const invoiceId = extractInvoiceId(zpData);
    let insertPayload = {
      customer_name: name, customer_contact: cleanContact, course, amount,
      promo_code: promoCode || null, affiliate_ref: ref || null,
      invoice_id: invoiceId, our_ref: ourRef, status: "pending",
    };

    let { error: insertErr } = await supabase.from("orders").insert(insertPayload);
    if (insertErr && insertErr.code === "PGRST204") {
      delete insertPayload.promo_code;
      delete insertPayload.affiliate_ref;
      const retry = await supabase.from("orders").insert(insertPayload);
      insertErr = retry.error;
    }

    if (insertErr) {
      console.error("Database insert error:", insertErr);
      return res.status(500).json({ error: "Database error: " + insertErr.message });
    }

    return res.status(200).json({ payment_url: zpData.payment_url });
  } catch (err) {
    console.error("create-invoice error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
