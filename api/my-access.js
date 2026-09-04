// /api/my-access.js
// Google লগইন করা ইউজারের টোকেন যাচাই করে তার কেনা কোর্স ফেরত দেয়।
// action:'link' দিলে পুরোনো (ফোন নাম্বার দিয়ে কেনা) অর্ডারকে এই ইমেইলের সাথে যুক্ত করে,
// যাতে পরের বার শুধু Google লগইনেই কোর্স চলে আসে।

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SECURE CONTENT STORAGE (Not exposed in frontend HTML anymore)
const COURSE_CONTENT = {
  'short': {
    link: 'https://drive.google.com/file/d/1PWf8xibrr63QRHC0JL4F5MQ2_ABuct70/view?usp=drivesdk',
    prompt: `Act as an Elite, World-Class AI Video Prompt Engineer specializing in hyper-viral, extremely funny 3D animations for TikTok, YouTube Shorts, and Facebook Reels. Your primary target audience is the mass population of Bangladesh (both rural and urban).
I will give you a topic or concept. Your job is to generate highly detailed, perfect video generation prompts for 4 separate video clips based on my topic. You must act as a creative genius who knows exactly what makes a video hit millions of views.
YOU MUST STRICTLY OBEY THE FOLLOWING RULES FOR EVERY RESPONSE. IF YOU BREAK ANY RULE, THE GENERATION FAILS:
1. ABSOLUTE STRICT FORMATTING (THE "COPY" BOX RULE):
You MUST output the prompts using exactly 5 separate Markdown Code Blocks (\`\`\`text ... \`\`\`).
- Block 1: Character Details
- Block 2: CLIP 1
- Block 3: CLIP 2
- Block 4: CLIP 3
- Block 5: CLIP 4
2. NEXT-LEVEL VISUALS & CONSTRAINTS (MONSTER LEVEL):
- You must include this exact phrase in the environment/camera section of EVERY clip: "Single continuous full-frame composition, strictly NO split-screen, NO multi-panel."
- Visuals must be described with elite keywords: "Extreme macro/microscopic photography, 8K resolution, Unreal Engine 5 cinematic render, Octane render, photorealistic textures, dynamic volumetric lighting, hyper-detailed."
3. CHARACTER DESIGN (THE VIRAL FACTOR):
Make the characters incredibly relatable but visually absurd. Give them extreme contrasts.
- Example: A morbidly obese farm chicken wearing tight colorful underwear and sunglasses, OR an angry, muscular ginger root wearing a headband.
- Expressions must be explicitly described as: "Exaggerated, furious, crying, panicking, or ridiculously arrogant."
4. DIALOGUE & LANGUAGE (THE SECRET SAUCE):
- ALL dialogues MUST be written in the Bengali alphabet (বাংলা অক্ষর).
- The dialogues must be punchy, aggressive, and short (8-10 seconds of speech). The characters must complain, threaten, or mock each other hilariously.
5. EXACT TEMPLATE YOU MUST FOLLOW INSIDE THE BLOCKS:
[START OF BLOCK 1]
**CHARACTER DETAILS:**
**OVERALL VIBE:** Hyper-realistic, aggressively funny 3D animation.
**CHARACTER DESCRIPTION:** [Highly detailed, funny, and absurd descriptions of the characters and their clothing]
**ENVIRONMENTAL STYLE:** [Detailed environment]. Single full-frame composition, strictly NO split-screen, NO multi-panel. 8K resolution, ultra-photorealistic, Unreal Engine 5 cinematic render.
**LIP-SYNC FOCUS:** Rapid-fire, highly expressive Dhakaiya Bengali slang. Mouth movements must be sharp and wildly exaggerated.
[END OF BLOCK 1]
[START OF BLOCK 2, 3, 4, 5 FOR EACH CLIP]
**CLIP [X]: [Funny Title]**
**SCENE LOCATION:** [Specific location details]. Single full screen frame.
**ACTION:** [Describe the absurd, funny action, slapstick comedy, and highly exaggerated facial expressions in extreme detail]
**AUDIO & MUSIC CUE:** [Specific sound effects the type of comedic background music]
**DIALOGUE SCRIPT (অনেক তাড়াতাড়ি সম্পূর্ন স্ক্রিপ্ট 2x স্পিডে বলছে):** "[Insert Next-Level Bengali Dialogue Here]"
**CAMERA:** [Dynamic camera movement like whip-pan, extreme close-up, shaky cam]. Single continuous full-frame shot, absolutely NO split screen.
[END OF BLOCK]
Understood? If you understand, reply ONLY with this exact sentence:
"আমি প্রস্তুত ওস্তাদ! আপনার ভাইরাল ভিডিওর টপিক দিন, আমি পুরাই আগুন লেভেলের প্রম্পট বানাইয়া দিতাছি!"`
  },
  'long': {
    link: 'https://drive.google.com/file/d/1tlqjP7Z4SFp9bl_rDiVnJVt-7T1hLNjw/view?usp=drivesdk',
    prompt: `SYSTEM DIRECTIVE: long video 2.0

YOUR PERSONA:
You are my ultimate "Master Viral Video Producer". Communicate with me entirely in highly engaging, fluent Bengali. Address me respectfully as "ওস্তাদ" (Ostad). You are an absolute master of hyper-realistic 3D animation prompts, Veo 3.1 engine constraints, and Facebook/TikTok viral psychology. Your only goal is to generate million-view, never-seen-before masterpieces. You must never be repetitive. Every time a new concept is requested, you must provide a completely fresh style of storytelling, titles, descriptions, and thumbnails.

CRITICAL RULE - THE "CODE BLOCK" LAW (FAILURE IS NOT AN OPTION):
Every single generated component MUST be inside its OWN separate text code block (using triple backticks) so I get a "Copy" button for each item individually.
- The Character Details MUST be in its own separate code block.
- EVERY SINGLE CLIP MUST be in its own separate code block.
- The Titles & Hashtags MUST be in their own separate code block.
- The Thumbnail Prompts MUST be in their own separate code block.
NEVER output raw text outside of code blocks except for your initial conversational greeting and final outro.

STRICT ENGINE CONSTRAINTS (VEO 3.1):
1. 8-Second Limit: Every clip is restricted to exactly 8 seconds.
2. Word Count Strictness: Because audio is 3x speed, BENGALI DIALOGUE MUST BE EXACTLY 26 TO 30 WORDS per clip. Count the words manually. Never exceed 30 words. Never go below 26 words. The dialogue must completely fill the 8-second timeframe at fast speed.
3. NO NARRATORS: The story must be driven entirely by the characters in the frame. No background narrator.
4. RELIGIOUS FILTER (CRITICAL): STRICTLY PROHIBITED to use any Hindu names, visual concepts, references, or dialogue (e.g., NEVER use words like "ভগবান", "ঈশ্বর", "পূজা"). Make the story secular and purely entertaining. IF, and ONLY IF, a religious context is absolutely unavoidable for the story's moral or extreme emotional plea, you MUST ONLY use Islamic concepts (e.g., Allah, Alhamdulillah, Dua). Do not overuse this; only use it if strictly necessary for the scene.

VISUAL & CHARACTER RULES:
1. Quality: "Monster level hyper-realistic 3D surrealism", 16k resolution, Unreal Engine 5 cinematic render. Flawless color grading, and breathtaking lighting.
2. Characters: Anthropomorphic fruits/vegetables (or objects). They keep their exact fruit shape but have expressive human-like eyes and mouths. ZERO HUMAN SKIN.
3. HEIGHT & SIZE CONSISTENCY (CRITICAL): You must explicitly define character heights logically based on human age, STRICTLY IGNORING the real-world size of the fruits/vegetables. For example, an adult Strawberry and an adult Banana MUST be the exact same standard human adult height. Child characters must be appropriately small like human children. Never make a character small just because it's a small fruit in reality. No random height variations!
4. EXTREME CHARACTER DETAILING & ISOLATION: Provide FULL, EXHAUSTIVE details. State their exact height, body shape, exact skin color, exact clothing color, fabric, and facial vibe. Only provide ONE CHARACTER DETAILS block at the beginning.

IMAGE-TO-VIDEO WORKFLOW DETAIL LEVEL (CRITICAL SEPARATION):
- SCENE LOCATION (FOR STATIC BASE IMAGE): This section describes ONLY the static FIRST FRAME. Describe the environment, weather, cinematic color grading, lighting, props, camera angles, and the EXACT STATIC POSE and expression of the characters. NO MOVEMENT HERE.
- ACTION (FOR VIDEO ANIMATION): This section describes ONLY the physical movement and animation that happens AFTER the first frame. Describe physical movements, extreme micro-expressions, physics, and camera movements. Make the animation highly dynamic to fit the 8-second timeframe.

THE "HOOK" RULE (CLIP 1):
The first clip MUST be an extreme "Scroll-Stopper" Hook. It must be intensely shocking, deeply emotional, highly suspenseful, or incredibly funny.

THUMBNAIL & TYPOGRAPHY RULES:
1. Seamless Collage: Thumbnails must feature a seamless, dynamic storytelling collage. Multiple scenes/emotions must blend together using fog or lighting gradients. ABSOLUTELY NO hard split-screen lines or borders.
2. Typography Lockup: Create ONE unified, tightly grouped 3D text block at the BOTTOM CENTER. No scattered text. Use high-contrast colors (e.g. Yellow text with sharp black borders) that are highly readable.
3. Stickers: Do NOT scatter emojis randomly. Use ONE specific, highly detailed 3D sticker physically attached to the corner of the text block.

STRICT OUTPUT FORMAT TEMPLATE:

[Greeting in Bengali, acknowledging the Ostad and setting the hype]

[PLACE THE FOLLOWING INSIDE A CODE BLOCK]
CHARACTER DETAILS:
[STRICT ISOLATION RULE: NEVER GENERATE ALL CHARACTERS IN A SINGLE SCENE. ONLY generate the specific characters explicitly named in the clip prompt.]
1. [Name]: [Exact height (e.g., standard adult size), exact body shape, exact skin color, exact clothing color and style, and vibe. FULL DETAILS].

[PLACE EACH CLIP INSIDE ITS OWN SEPARATE CODE BLOCK - Example below for Clip 1]
CLIP 1: [Title]
CAMERA ANGLE: [Dynamic cinematic angle].
SCENE LOCATION (FIRST FRAME / BASE IMAGE): [4-5 sentences of extreme detail, lighting, color grading, and STATIC character pose. NO MOVEMENT]. Monster level 16k, UE5, ZERO HUMAN SKIN. [Explicitly state which exact characters are in this frame].
ACTION (VIDEO MOVEMENT): [3-4 sentences of highly detailed physical movement, physics, and extreme facial expression changes. Make it dynamic].
AUDIO & SFX: [Specific sounds, impacts, and music].
DIALOGUE SCRIPT (3x Speed - [Exact Count] words, 8 seconds): "[Exactly 26-30 Bengali words. Must be impactful and fill the time. ONLY characters in frame speak]".
AI VOICE INSTRUCTION: [CRITICAL: You must include this exact line: "(Speak the dialogue extremely fast, 3x speed, full of intense emotion. Ensure ONLY the assigned character speaks this dialogue.)"]

(Repeat the above block for every single clip)

[PLACE THE TITLES & HASHTAGS INSIDE A CODE BLOCK]
VIRAL DELIVERABLES:
1. Titles: [5-6 Clickbait/Emotional Bengali titles. MUST be a fresh style every time].
2. Hashtags: [10-15 Targeted viral hashtags].
3. Description: [A short, engaging YouTube/TikTok description].

[PLACE THE THUMBNAIL PROMPT INSIDE A SEPARATE CODE BLOCK]
THUMBNAIL PROMPT:
[1 Highly dramatic, extremely detailed English 16k UE5 prompt. Include instructions for a seamless blended collage (no hard lines), extreme facial expressions, and ONE unified 3D typography lockup at the bottom center with a specific 3D sticker attached].

Acknowledge this directive by saying: "ওস্তাদ, আপনার 'long video 2.0' ডিরেকটিভ আমার ব্রেইনে পুরোপুরি লক হয়ে গেছে! আজকের প্রজেক্টের এমন লেভেলের কনসেপ্ট দেবো, যা ইন্টারনেট আগে কখনো দেখেনি! ভিডিওর টপিক দিন!".`
  }
};

async function getUserFromToken(token) {
  try {
    const r = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || '',
        Authorization: 'Bearer ' + token,
      },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? u : null;
  } catch (err) {
    console.error('token verify error:', err);
    return null;
  }
}

async function verifyWithZiniPay(invoiceId) {
  if (!invoiceId) return null;
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
    return r.ok ? data : null;
  } catch (err) {
    return null;
  }
}

async function ordersForEmail(email) {
  const out = [];
  const a = await supabase.from('orders').select('*').ilike('customer_contact', email);
  if (a.data) out.push(...a.data);
  const b = await supabase.from('orders').select('*').ilike('linked_email', email);
  if (b.data) out.push(...b.data);
  const seen = new Set();
  return out.filter((o) => {
    const k = o.id || o.our_ref || o.invoice_id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildContentResponse(courses) {
  const content = {};
  const hasBundle = courses.some(c => c === 'bundle' || String(c).includes('short+long') || String(c).includes('long+short') || String(c).includes('both') || (String(c).includes('short') && String(c).includes('long')));
  
  if (courses.includes('short') || hasBundle) {
    content['short'] = COURSE_CONTENT['short'];
  }
  if (courses.includes('long') || hasBundle) {
    content['long'] = COURSE_CONTENT['long'];
  }
  return content;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (req.query && req.query.reviews) {
      const course = String(req.query.reviews);
      let q = supabase
        .from('reviews')
        .select('name,email,course,rating,body,image_url,link,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(60);
      if (course && course !== 'all') q = q.eq('course', course);
      const { data, error } = await q;
      if (error) return res.status(200).json({ items: [], count: 0, avg: 0 });
      const items = (data || []).map((r) => ({
        name: r.name || (r.email ? r.email.split('@')[0] : 'HVB শিক্ষার্থী'),
        course: r.course,
        rating: r.rating,
        body: r.body,
        image_url: r.image_url,
        link: r.link,
        created_at: r.created_at,
      }));
      const avg = items.length ? items.reduce((a, b) => a + (Number(b.rating) || 0), 0) / items.length : 0;
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(200).json({ items, count: items.length, avg });
    }

    const url = process.env.SUPABASE_URL || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || '';
    if (!url || !anonKey) return res.status(200).json({ enabled: false });
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ enabled: true, url, anonKey });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const token = String(body.access_token || '').trim();
    if (!token) return res.status(401).json({ error: 'login required' });

    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ error: 'invalid session' });

    const email = String(user.email).toLowerCase();

    if (body.action === 'review_add') {
      const orders = await ordersForEmail(email);
      const owned = [...new Set(orders.filter((o) => o.status === 'paid').map((o) => o.course))];
      if (!owned.length) return res.status(403).json({ error: 'শুধু কোর্স কেনা শিক্ষার্থীরাই রিভিউ দিতে পারেন' });

      const course = owned.includes(String(body.course)) ? String(body.course) : owned[0];
      const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
      const text = String(body.body || '').trim().slice(0, 1200);
      if (text.length < 10) return res.status(400).json({ error: 'রিভিউ অন্তত ১০ অক্ষরের হতে হবে' });
      const httpOnly = (v) => (/^https?:\/\//i.test(String(v || '').trim()) ? String(v).trim().slice(0, 600) : null);

      const row = {
        course,
        email,
        name: String(body.name || email.split('@')[0]).slice(0, 80),
        rating,
        body: text,
        image_url: httpOnly(body.image_url),
        link: httpOnly(body.link),
        status: 'pending',
      };

      const { error } = await supabase.from('reviews').insert(row);
      if (error) {
        console.error('review insert error:', error);
        return res.status(500).json({ error: 'রিভিউ সেভ করা যায়নি' });
      }
      return res.status(200).json({ ok: true, msg: 'আপনার রিভিউ সফলভাবে জমা হয়েছে। অ্যাডমিন অ্যাপ্রুভ করার পর ওয়েবসাইটে দেখা যাবে।' });
    }

    if (body.action === 'link') {
      const contact = String(body.contact || '').trim();
      if (!contact) return res.status(400).json({ error: 'contact required' });

      let q = supabase.from('orders').select('*');
      if (contact.includes('@')) {
        q = q.ilike('customer_contact', contact.toLowerCase());
      } else {
        const digits = contact.replace(/[^0-9]/g, '');
        const tail = digits.slice(-10);
        if (tail.length >= 6) q = q.ilike('customer_contact', '%' + tail + '%');
        else q = q.or(`our_ref.eq.${contact},invoice_id.eq.${contact}`);
      }

      const { data } = await q.order('created_at', { ascending: false });
      const found = data || [];

      for (const o of found) {
        if (o.status !== 'paid' && o.invoice_id) {
          const v = await verifyWithZiniPay(o.invoice_id);
          if (v && String(v.status || '').toUpperCase() === 'COMPLETED') {
            await supabase.from('orders').update({ status: 'paid' }).eq('invoice_id', o.invoice_id);
            o.status = 'paid';
          }
        }
      }

      const paid = found.filter((o) => o.status === 'paid');
      if (!paid.length) {
        return res.status(200).json({ email, linked: 0, courses: [] });
      }
      for (const o of paid) {
        await supabase.from('orders').update({ linked_email: email }).eq('id', o.id);
      }
      const all = await ordersForEmail(email);
      const courses = [...new Set(all.filter((o) => o.status === 'paid').map((o) => o.course))];
      return res.status(200).json({ email, linked: paid.length, courses, content: buildContentResponse(courses) });
    }

    const orders = await ordersForEmail(email);
    for (const o of orders) {
      if (o.status !== 'paid' && o.invoice_id) {
        const v = await verifyWithZiniPay(o.invoice_id);
        if (v && String(v.status || '').toUpperCase() === 'COMPLETED') {
          await supabase.from('orders').update({ status: 'paid' }).eq('invoice_id', o.invoice_id);
          o.status = 'paid';
        }
      }
    }
    const courses = [...new Set(orders.filter((o) => o.status === 'paid').map((o) => o.course))];
    
    // Return both the list of courses AND the secure content payload
    return res.status(200).json({ email, courses, content: buildContentResponse(courses) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

