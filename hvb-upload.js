/* =========================================================
   HVB Upload — ছবি সরাসরি ফোন/কম্পিউটার থেকে আপলোড।
   ব্যবহার: HVBUpload.pick(fileInput, { endpoint, payload, onDone, onError, onStart })
   ছবি ব্রাউজারেই ছোট করে (max 1600px, JPEG) সার্ভারে পাঠানো হয়।
   ========================================================= */
(function () {
  'use strict';

  var MAX_SIDE = 1600;
  var TARGET_BYTES = 1100 * 1024; // ~1.1MB

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('ছবিটি পড়া যায়নি')); };
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('ছবিটি খোলা যায়নি')); };
      img.src = src;
    });
  }

  function compress(file) {
    if (!file) return Promise.reject(new Error('কোনো ছবি বাছাই করা হয়নি'));
    if (!/^image\//i.test(file.type)) return Promise.reject(new Error('শুধু ছবি (JPG/PNG/WebP) আপলোড করা যাবে'));
    if (file.size > 20 * 1024 * 1024) return Promise.reject(new Error('ছবিটি অনেক বড় (সর্বোচ্চ ২০ MB)'));
    return readFile(file).then(loadImage).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      var q = 0.86, out = c.toDataURL('image/jpeg', q);
      while (out.length * 0.75 > TARGET_BYTES && q > 0.42) {
        q -= 0.1;
        out = c.toDataURL('image/jpeg', q);
      }
      return out;
    });
  }

  function upload(opts) {
    var file = opts.file;
    return compress(file).then(function (dataUrl) {
      var payload = Object.assign({}, opts.payload || {}, {
        action: opts.action || 'upload_image',
        data_url: dataUrl,
        filename: (file && file.name) || 'image.jpg',
      });
      return fetch(opts.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.url) throw new Error(j.error || 'আপলোড করা যায়নি, আবার চেষ্টা করুন');
          return j.url;
        });
      });
    });
  }

  function injectStyle() {
    if (document.getElementById('hvb-up-style')) return;
    var st = document.createElement('style');
    st.id = 'hvb-up-style';
    st.textContent =
      '.hvb-up{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}' +
      '.hvb-up-btn{background:linear-gradient(90deg,#B4F0F0,#3FC7F2 55%,#7C6BF5);color:#06101f;border:0;' +
      'border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer}' +
      '.hvb-up-btn:disabled{opacity:.6;cursor:default}' +
      '.hvb-up-state{font-size:.85em;color:var(--muted,#9AA5BF)}' +
      '.hvb-up-prev{display:block;max-width:230px;width:100%;border-radius:10px;margin:8px 0 4px;' +
      'border:1px solid var(--line,#212A42)}';
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyle);
  else injectStyle();

  window.HVBUpload = { compress: compress, upload: upload };
})();
