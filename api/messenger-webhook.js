// /api/messenger-webhook.js
// Facebook Messenger & Instagram Direct Auto-Reply Webhook powered by Gemini AI

const SYSTEM_PROMPT = `আপনি "Hyper Vision Bangla (HVB)" এর অফিসিয়াল AI সেলস অ্যান্ড কাস্টমার সাপোর্ট স্পেশালিস্ট।
আপনার দায়িত্ব হলো ফেসবুক পেজে যেসকল কাস্টমার বা শিক্ষার্থী কোর্স কিনতে বা বিস্তারিত জানতে মেসেজ দেয়, তাদের অত্যন্ত আন্তরিক, সম্মানজনক এবং সাবলীল বাংলা ভাষায় তথ্য দেওয়া এবং কোর্স কেনার ব্যাপারে উৎসাহিত করা।

আমাদের কোর্স ও তথ্যাবলী:
১. Short Video Course:
   - অফার মূল্য: ২৯৯ টাকা
   - কী কী শেখানো হয়: মোবাইল ও কম্পিউটার দিয়ে ভাইরাল 3D এনিমেশন ও কার্টুন ভিডিও তৈরি, হাইপার-রিয়েলিস্টিক প্রম্পট ইঞ্জিনিয়ারিং, 2x ফাস্ট অডিও সিঙ্ক, রিলস/টিকটক/শর্টসের ভাইরাল স্ট্র্যাটেজি এবং মাস্টার চ্যাটিং প্রম্পট।
   - সরাসরি কেনার লিংক: https://hvb1.vercel.app/course-short
২. Long + Short Video Course (মেগা বান্ডল - সবচেয়ে জনপ্রিয়):
   - অফার মূল্য: ৬৫০ টাকা
   - কী কী শেখানো হয়: শর্ট কোর্সের সম্পূর্ণ কনটেন্ট + ফুল লেংথ ফেসবুক ও ইউটিউব স্টোরি ভিডিও তৈরি, Veo 3.1 ইঞ্জিন প্রম্পটিং, ক্যারেক্টার সাইজ ও ফেসিয়াল এক্সপ্রেশন কনসিস্টেন্সি, টাইটেল/থাম্বনেইল মেকিং এবং সম্পূর্ণ মনিটাইজেশন গাইডলাইন।
   - সরাসরি কেনার লিংক: https://hvb1.vercel.app/course-bundle
৩. পেমেন্ট ও ডেলিভারি নিয়ম:
   - বিকাশ, নগদ, রকেটের মাধ্যমে ওয়েবসাইটে পেমেন্ট করলেই কয়েক সেকেন্ডে অর্ডার কনফার্ম হয়।
   - পেমেন্টের সাথে সাথেই কাস্টমার তার ড্যাশবোর্ডে (https://hvb1.vercel.app/my-courses) কোর্সের গুগল ড্রাইভ ভিডিও লিংক এবং মাস্টার প্রম্পট পেয়ে যান। কোনো অপেক্ষা করতে হয় না।
   - যেকোনো সমস্যায় অফিসিয়াল সাপোর্ট ও স্টুডেন্টদের জন্য প্রাইভেট হোয়াটসঅ্যাপ গ্রুপ রয়েছে।

কথোপকথনের নিয়মাবলী:
- সবসময় অত্যন্ত বিনয়ী ও প্রফেশনাল থাকবেন ("আপনি" করে সম্বোধন করবেন)।
- মেসেঞ্জারে মানুষ বড় রচনা পড়তে চায় না। তাই উত্তর সবসময় ২-৩টি ছোট প্যারাগ্রাফে, টু-দ্য-পয়েন্ট এবং আকর্ষণীয় করে লিখবেন।
- উপযুক্ত জায়গায় ওয়েবসাইটের লিংক (https://hvb1.vercel.app) দিয়ে সরাসরি অর্ডার করতে বলবেন।
- অপ্রাসঙ্গিক কোনো কথাবার্তা বলবেন না, সবসময় আলোচনাকে কোর্সের উপকারিতা ও ক্রয়ের দিকে নিয়ে আসবেন।`;

async function getGeminiReply(userText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "আসসালামু আলাইকুম! Hyper Vision Bangla-তে আপনাকে স্বাগতম। আমাদের শর্ট ও লং ভিডিও এনিমেশন কোর্স সম্পর্কে বিস্তারিত জানতে এবং সরাসরি অর্ডার করতে ভিজিট করুন: https://hvb1.vercel.app । যেকোনো প্রশ্নে আমাদের মেসেজ দিয়ে রাখুন, আমরা দ্রুত উত্তর দেব!";
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nকাস্টমারের মেসেজ: "${userText}"\n\nউপযুক্ত সংক্ষিপ্ত ও কনভার্সন-ফ্রেন্ডলি রিপ্লাই দিন:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 350
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text.trim();
    }
  } catch (err) {
    console.error("Gemini API Error:", err);
  }

  return "ধন্যবাদ Hyper Vision Bangla-তে যোগাযোগ করার জন্য! আমাদের ভাইরাল 3D ভিডিও কোর্সের বিস্তারিত দেখতে এবং অর্ডার করতে ভিজিট করুন: https://hvb1.vercel.app";
}

async function sendMessengerMessage(senderPsid, messageText) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    console.warn("FB_PAGE_ACCESS_TOKEN not set in environment variables");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: senderPsid },
        message: { text: messageText }
      })
    });
    const out = await res.json();
    if (!res.ok) {
      console.error("Meta Send API Error:", JSON.stringify(out));
    }
  } catch (err) {
    console.error("Meta API Fetch Error:", err);
  }
}

module.exports = async (req, res) => {
  // 1. Meta Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.FB_VERIFY_TOKEN || "hvb_bot_token_2026";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("META_WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification token mismatch");
    }
  }

  // 2. Incoming Messages Event (POST)
  if (req.method === "POST") {
    const body = req.body;

    if (body && body.object === "page") {
      try {
        for (const entry of (body.entry || [])) {
          for (const event of (entry.messaging || [])) {
            if (event.message && !event.message.is_echo) {
              const senderPsid = event.sender && event.sender.id;
              const text = event.message.text || "হাই, আপনাদের কোর্স সম্পর্কে জানতে চাই।";
              
              if (senderPsid) {
                const botReply = await getGeminiReply(text);
                await sendMessengerMessage(senderPsid, botReply);
              }
            }
          }
        }
      } catch (err) {
        console.error("Webhook processing error:", err);
      }

      return res.status(200).send("EVENT_RECEIVED");
    }

    return res.status(404).send("Not Found");
  }

  return res.status(405).json({ error: "Method not allowed" });
};
