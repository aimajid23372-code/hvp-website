const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSES = { bundle: { amount: 999 }, short: { amount: 499 } };

function extractInvoiceId(zpData) {
  if (zpData && zpData.invoice_id) return zpData.invoice_id;
  const url = zpData && zpData.payment_url;
  if (!url) return null;
  const parts = String(url).split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(410).json({ error: "Customer Wallet বন্ধ আছে। কোর্স কিনতে সরাসরি অনলাইন পেমেন্ট ব্যবহার করুন।" });
};
