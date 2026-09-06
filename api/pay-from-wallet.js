const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSES = { bundle: { amount: 650 }, short: { amount: 299 } };

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { course, email, promoCode, ref } = req.body;
    if (!COURSES[course] || !email) return res.status(400).json({ error: "Invalid data" });
    
    let amount = COURSES[course].amount;
    const cleanEmail = String(email).toLowerCase().trim();

    if (promoCode) {
      const { data: promo } = await supabase.from("promo_codes").select("*").eq("code", String(promoCode).toUpperCase()).eq("active", true).maybeSingle();
      if (promo) amount = Math.round(amount - (amount * promo.discount_percent) / 100);
    }

    // Check balance
    const { data: w } = await supabase.from("wallets").select("balance").eq("email", cleanEmail).maybeSingle();
    const balance = w ? Number(w.balance) : 0;
    if (balance < amount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Deduct balance
    const newBal = balance - amount;
    await supabase.from("wallets").update({ balance: newBal }).eq("email", cleanEmail);

    // Create paid order
    const ourRef = crypto.randomUUID();
    let insertPayload = {
      customer_name: "Wallet User",
      customer_contact: cleanEmail,
      course,
      amount,
      promo_code: promoCode || null,
      affiliate_ref: ref || null,
      invoice_id: "wallet_" + Date.now(),
      our_ref: ourRef,
      status: "paid",
      payment_method: "wallet"
    };

    let { error: insertErr } = await supabase.from("orders").insert(insertPayload);
    if (insertErr && insertErr.code === "PGRST204") {
      delete insertPayload.promo_code;
      delete insertPayload.affiliate_ref;
      const retry = await supabase.from("orders").insert(insertPayload);
      insertErr = retry.error;
    }
    if (insertErr) return res.status(500).json({ error: "Database error: " + insertErr.message });

    return res.status(200).json({ success: true, order: ourRef });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

