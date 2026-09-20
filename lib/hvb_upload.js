// lib/hvb_upload.js — base64 ছবি Supabase Storage-এ রেখে পাবলিক লিংক ফেরত দেয়।
// নতুন serverless function লাগে না; my-access.js ও admin.js দুটোই এটি ব্যবহার করে।

const BUCKET = 'hvb-uploads';
const MAX_BYTES = 3 * 1024 * 1024; // ~3MB (ব্রাউজারেই ছোট করে পাঠানো হয়)

let bucketReady = false;

async function ensureBucket(supabase) {
  if (bucketReady) return;
  try {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: '10MB',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
    }
    bucketReady = true;
  } catch (err) {
    try {
      await supabase.storage.createBucket(BUCKET, { public: true });
      bucketReady = true;
    } catch (e) {
      /* বাকেট আগে থেকেই থাকতে পারে */
      bucketReady = true;
    }
  }
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/(jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || '').trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const buf = Buffer.from(m[3].replace(/\s/g, ''), 'base64');
  if (!buf.length) return null;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { mime, buf, ext };
}

// folder: 'reviews' | 'courses' | 'site'
async function uploadDataUrl(supabase, folder, dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { error: 'ছবির ফরম্যাট ঠিক নেই (JPG/PNG/WebP দিন)' };
  if (parsed.buf.length > MAX_BYTES) return { error: 'ছবিটি অনেক বড়, ছোট ছবি দিন' };

  await ensureBucket(supabase);

  const safeFolder = /^[a-z-]+$/.test(String(folder)) ? folder : 'misc';
  const name = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${parsed.ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(name, parsed.buf, {
    contentType: parsed.mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    console.error('upload error:', error.message);
    return { error: 'ছবি আপলোড করা যায়নি, আবার চেষ্টা করুন' };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return { url: data && data.publicUrl ? data.publicUrl : null, path: name };
}

module.exports = { uploadDataUrl, BUCKET };
