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

async function emailFromToken(token) {
  if (!token) return null;
  try {
    const r = await fetch(process.env.SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || "",
        Authorization: "Bearer " + token,
      },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? String(u.email).toLowerCase() : null;
  } catch (err) {
    return null;
  }
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
    const accessToken = String(req.body.access_token || '').trim();
    if (!COURSES[course] || !name || !contact) return res.status(400).json({ error: "Missing information" });

    const { data: sData } = await supabase.from("settings").select("*");
    let settings = {};
    if (sData) sData.forEach(s => settings[s.key] = s.value);
    
    // Fixed checkout prices prevent stale dashboard settings from changing ZiniPay totals.
    const baseAmount = COURSES[course].amount;

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

    const loginEmail = await emailFromToken(accessToken);

    const zpRes = await fetch("https://api.zinipay.com/v1/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", "zini-api-key": process.env.ZINIPAY_API_KEY },
      body: JSON.stringify({
        amount, cus_name: name, cus_email, cus_phone, metadata: { our_ref: ourRef, course },
        redirect_url: siteUrl + "/my-courses?order=" + ourRef,
        success_url: siteUrl + "/my-courses?order=" + ourRef,
        cancel_url: siteUrl + "/course-" + course,
        webhook_url: siteUrl + "/api/zinipay-webhook",
      }),
    });

    const zpText = await zpRes.text();
    let zpData = null;
    try {
      zpData = JSON.parse(zpText);
    } catch (parseError) {
      const objectStart = zpText.indexOf("{");
      const objectEnd = zpText.lastIndexOf("}");
      if (objectStart !== -1 && objectEnd > objectStart) {
        try {
          zpData = JSON.parse(zpText.slice(objectStart, objectEnd + 1));
        } catch (nestedParseError) {
          console.error("ZiniPay returned invalid JSON:", zpText.slice(0, 500));
        }
      }
    }

    if (!zpRes.ok || !zpData || !zpData.payment_url) {
      console.error("ZiniPay create failed:", zpRes.status, zpText.slice(0, 500));
      return res.status(502).json({ error: "Payment gateway error. Please try again later." });
    }

    const invoiceId = extractInvoiceId(zpData);
    let insertPayload = {
      customer_name: name, customer_contact: cleanContact, course, amount,
      promo_code: promoCode || null, affiliate_ref: ref || null,
      invoice_id: invoiceId, our_ref: ourRef, status: "pending",
    };
    if (loginEmail) insertPayload.linked_email = loginEmail;

    let { error: insertErr } = await supabase.from("orders").insert(insertPayload);
    if (insertErr && insertErr.code === "PGRST204") {
      delete insertPayload.promo_code;
      delete insertPayload.affiliate_ref;
      delete insertPayload.linked_email;
      const retry = await supabase.from("orders").insert(insertPayload);
      insertErr = retry.error;
    }

    if (insertErr) {
      console.error("Database insert error:", insertErr);
      return res.status(500).json({ error: "Database error: " + insertErr.message });
    }

    return res.status(200).json({ payment_url: zpData.payment_url, order: ourRef });
  } catch (err) {
    console.error("create-invoice error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
