const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSES = {
  bundle: { amount: 999 },
  short: { amount: 499 },
  long: { amount: 799 },
  "ai-kids-comedy": { amount: 399 },
  kids: { amount: 399 },
};

const BUILTIN_PROMOS = {
  HVB50: { type: "fixed", value: 50 },
  SHORT445: { type: "fixed", value: 54 },
  LAUNCH10: { type: "percent", value: 10 },
};

function extractPaymentUrl(data) {
  if (!data || typeof data !== "object") return null;
  const nested = data.data && typeof data.data === "object" ? data.data : {};
  return (
    data.payment_url ||
    data.paymentUrl ||
    data.checkout_url ||
    data.checkoutUrl ||
    data.invoice_url ||
    data.redirect_url ||
    data.url ||
    data.link ||
    nested.payment_url ||
    nested.checkout_url ||
    nested.url ||
    null
  );
}

function extractInvoiceId(data, fallbackId) {
  if (data && typeof data === "object") {
    const nested = data.data && typeof data.data === "object" ? data.data : {};
    const direct =
      data.invoice_id ||
      data.payment_id ||
      data.id ||
      data.order_id ||
      nested.invoice_id ||
      nested.payment_id ||
      nested.id;
    if (direct) return String(direct);
    const url = extractPaymentUrl(data);
    if (url) {
      const parts = String(url).split("?")[0].split("/").filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
  }
  return fallbackId;
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
    const body = req.body || {};
    const action = body.action;
    const promoCode = String(body.promoCode || body.promo_code || body.coupon || body.coupon_code || "").trim().toUpperCase();

    if (action === "checkPromo") {
      if (!promoCode) return res.status(200).json({ valid: false });
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode)
        .eq("active", true)
        .maybeSingle();
      if (promo) return res.status(200).json({ valid: true, discount: promo.discount_percent });
      return res.status(200).json({ valid: false });
    }

    const rawCourse = String(body.course || body.product || body.product_id || body.course_id || "").trim();
    const course = rawCourse === "kids" ? "ai-kids-comedy" : rawCourse;
    const name = String(body.name || body.customer_name || body.cus_name || "").trim();
    const rawEmail = String(body.email || body.customer_email || body.cus_email || "").trim();
    const rawPhone = String(body.phone || body.customer_phone || body.cus_phone || "").trim();
    const contact = String(body.contact || rawPhone || rawEmail || "").trim();
    const ref = body.ref || body.referral_code || null;
    const accessToken = String(body.access_token || "").trim();

    if (!course || !name || !contact) {
      return res.status(400).json({ error: "অনুগ্রহ করে নাম, মোবাইল নাম্বার ও কোর্স সঠিকভাবে দিন।" });
    }

    // Price lookup: products table first, then fallback COURSES map
    let baseAmount = COURSES[course] ? COURSES[course].amount : 0;
    try {
      const { data: prod } = await supabase
        .from("products")
        .select("price, active")
        .eq("slug", course)
        .maybeSingle();
      if (prod && prod.active === false) {
        return res.status(400).json({ error: "এই কোর্সটি এখন Enroll করা যাচ্ছে না" });
      }
      if (prod && Number(prod.price) > 0) baseAmount = Number(prod.price);
    } catch (e) {}

    if (!baseAmount || baseAmount < 1) {
      return res.status(400).json({ error: "Course unavailable" });
    }

    let amount = baseAmount;
    if (promoCode) {
      let applied = false;
      try {
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", promoCode)
          .eq("active", true)
          .maybeSingle();
        if (promo && Number(promo.discount_percent) > 0) {
          amount = Math.round(amount - (amount * Number(promo.discount_percent)) / 100);
          applied = true;
        }
      } catch (e) {}
      if (!applied && BUILTIN_PROMOS[promoCode]) {
        const rule = BUILTIN_PROMOS[promoCode];
        amount = rule.type === "percent"
          ? Math.round(amount - (amount * rule.value) / 100)
          : Math.max(99, amount - rule.value);
      }
    }

    const cleanContact = contact;
    const cus_email = rawEmail || (cleanContact.includes("@") ? cleanContact : "no-email@hypervisionbd.com");
    const cus_phone = rawPhone || (cleanContact.includes("@") ? "01000000000" : cleanContact);
    const ourRef = "HVB-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const fallbackUrl = req.headers.origin || ("https://" + (req.headers.host || "hypervisionbd.com"));
    const siteUrl = (process.env.SITE_URL || fallbackUrl).replace(/\/$/, "");
    const loginEmail = await emailFromToken(accessToken);

    const shohojApiKey = process.env.SHOHOJPAY_API_KEY || "sp_live_owner_98a72b41c65d89e01f23a45b";
    const shohojApiUrl = process.env.SHOHOJPAY_API_URL || "https://shohojpay-platform.vercel.app/api/create-payment";

    const spRes = await fetch(shohojApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "shohojpay-api-key": shohojApiKey,
      },
      body: JSON.stringify({
        amount,
        order_id: ourRef,
        webhook_url: siteUrl + "/api/zinipay-webhook",
        redirect_url: siteUrl + "/my-courses?order=" + encodeURIComponent(ourRef),
        success_url: siteUrl + "/my-courses?order=" + encodeURIComponent(ourRef),
        cancel_url: siteUrl + (course === "short" || course === "bundle" || course === "long" ? "/course-" + course : "/ai-kids-comedy"),
        customer_name: name,
        customer_email: cus_email,
        customer_phone: cus_phone,
        metadata: { our_ref: ourRef, course },
      }),
    });

    const spText = await spRes.text();
    let spData = null;
    try {
      spData = JSON.parse(spText);
    } catch (e) {
      const s = spText.indexOf("{");
      const end = spText.lastIndexOf("}");
      if (s !== -1 && end > s) {
        try { spData = JSON.parse(spText.slice(s, end + 1)); } catch (e2) {}
      }
    }

    const paymentUrl = extractPaymentUrl(spData);
    if (!spRes.ok || !paymentUrl) {
      console.error("ShohojPay create failed:", spRes.status, spText.slice(0, 500));
      const msg = (spData && (spData.error || spData.message)) || ("ShohojPay HTTP " + spRes.status);
      return res.status(502).json({ error: "ShohojPay পেমেন্ট শুরু করা যায়নি: " + msg });
    }

    const invoiceId = extractInvoiceId(spData, ourRef);
    let insertPayload = {
      customer_name: name,
      customer_contact: rawEmail || cleanContact,
      course,
      amount,
      promo_code: promoCode || null,
      affiliate_ref: ref || null,
      invoice_id: invoiceId,
      our_ref: ourRef,
      status: "pending",
    };
    if (loginEmail) insertPayload.linked_email = loginEmail;
    else if (rawEmail) insertPayload.linked_email = rawEmail.toLowerCase();

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

    return res.status(200).json({ payment_url: paymentUrl, order: ourRef, invoice_id: invoiceId });
  } catch (err) {
    console.error("create-invoice error:", err);
    return res.status(500).json({ error: "Server error: " + (err && err.message ? err.message : "unknown") });
  }
};
