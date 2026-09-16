// HVB visitor tracking — কে কখন কোন পেজে এল, কে পেমেন্ট পেজে গেল, সব রেকর্ড হয়।
// প্রতিটা পেজে <script src="hvb-track.js"></script> দিলেই চলবে।
(function () {
  var VKEY = 'hvb_vid';

  function uid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'v' + Date.now() + Math.random().toString(36).slice(2, 10);
  }

  function visitorId() {
    var v = '';
    try {
      v = localStorage.getItem(VKEY) || '';
      if (!v) { v = uid(); localStorage.setItem(VKEY, v); }
    } catch (e) { v = uid(); }
    return v;
  }

  // Ref code 30 দিন পর্যন্ত localStorage-এ থাকবে
  // কেউ link-এ ক্লিক করলে সেই ref ৩০ দিনের মধ্যে যেকোনো সময় কিনলেই কমিশন যাবে
  window.hvbGetRef = function() {
    try {
      var storedRef = localStorage.getItem('hvb_ref') || '';
      var storedAt = parseInt(localStorage.getItem('hvb_ref_at') || '0', 10);
      var EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 দিন
      if (storedRef && storedAt && (Date.now() - storedAt) < EXPIRY_MS) {
        return storedRef;
      }
      // মেয়াদ শেষ হলে মুছে ফেলো
      if (storedRef) {
        localStorage.removeItem('hvb_ref');
        localStorage.removeItem('hvb_ref_at');
      }
      return '';
    } catch (e) { return ''; }
  };

  // URL-এ ?ref= থাকলে save করো (যেকোনো পেজে এলেও)
  try {
    var _urlRef = (new URLSearchParams(window.location.search).get('ref') || '').trim().toLowerCase();
    if (_urlRef && /^[a-z0-9]{3,30}$/.test(_urlRef)) {
      localStorage.setItem('hvb_ref', _urlRef);
      localStorage.setItem('hvb_ref_at', String(Date.now()));
    }
  } catch(e) {}

  function ref() {
    try {
      return window.hvbGetRef();
    } catch (e) { return ''; }
  }

  function send(event, meta) {
    var body = {
      event: event || 'pageview',
      page: location.pathname + location.search,
      visitor_id: visitorId(),
      ref_code: ref(),
      referrer: document.referrer || '',
      meta: meta || null,
    };
    try {
      var payload = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch (e) {}
  }

  window.hvbTrack = send;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { send('pageview'); });
  } else {
    send('pageview');
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('button,a') : null;
    if (!el) return;
    var t = (el.textContent || '').trim().slice(0, 60);
    if (/কিন|পেমেন্ট|Buy|Pay|Enroll|Checkout/i.test(t)) send('payment_click', { label: t });
  }, true);

  // v7 UI enhancement (compact header, course banners, clickable titles, classy emoji)
  try {
    var s = document.createElement('script');
    s.src = '/hvb-v8.js?v=8';
    s.async = true;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();
  // --- HVB Dynamic Prices + Website Settings (single source: products table) ---
  (function () {
    var bnD = ['\u09E6','\u09E7','\u09E8','\u09E9','\u09EA','\u09EB','\u09EC','\u09ED','\u09EE','\u09EF'];
    function toBn(n) { return String(n).split('').map(function (d) { return bnD[d] || d; }).join(''); }
    var TK = ' \u09F3';
    window.HVB_PRICES = window.HVB_PRICES || {};
    function applyPrice(slug, price, regular) {
      price = Number(price || 0);
      if (!slug || !price) return;
      window.HVB_PRICES[slug] = price;
      document.querySelectorAll('[data-hvb-price="' + slug + '"], .dyn-price-' + slug).forEach(function (el) {
        el.textContent = toBn(price) + TK;
      });
      document.querySelectorAll('[data-hvb-price-plain="' + slug + '"]').forEach(function (el) {
        el.textContent = toBn(price);
      });
      document.querySelectorAll('[data-hvb-oldprice="' + slug + '"]').forEach(function (el) {
        if (regular && Number(regular) > price) {
          el.textContent = toBn(Number(regular).toLocaleString('en-US')) + TK;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }
    function notify() {
      try { if (typeof window.hvbOnPrices === 'function') window.hvbOnPrices(window.HVB_PRICES); } catch (e) {}
    }
    function post(event) {
      return fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event })
      }).then(function (r) { return r.json(); });
    }
    function run() {
      post('products_get').then(function (d) {
        ((d && d.products) || []).forEach(function (p) { applyPrice(p.slug, p.price, p.regular_price); });
        notify();
      }).catch(function () {});
      post('settings_get').then(function (d) {
        var conf = {};
        ((d && d.settings) || []).forEach(function (s) { conf[s.key] = s.value; });
        if (!window.HVB_PRICES.bundle && conf.price_bundle) applyPrice('bundle', conf.price_bundle);
        if (!window.HVB_PRICES.short && conf.price_short) applyPrice('short', conf.price_short);
        if (conf.messenger_link) document.querySelectorAll('.dyn-messenger-link').forEach(function (el) { el.href = conf.messenger_link; });
        if (conf.group_link) document.querySelectorAll('.dyn-group-link').forEach(function (el) { el.href = conf.group_link; });
        if (conf.color_primary) document.documentElement.style.setProperty('--cyan', conf.color_primary);
        if (conf.color_secondary) document.documentElement.style.setProperty('--violet', conf.color_secondary);
        notify();
      }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  })();

/* ---------- পেমেন্টের সাথে সাথেই কোর্স চালু (auto access) ----------
   /api/create-invoice কলে লগইন করা ইউজারের টোকেন যুক্ত করে দেয়, যাতে
   পেমেন্ট সফল হওয়ার সাথে সাথেই অর্ডারটি ওই অ্যাকাউন্টের সাথে যুক্ত হয়ে যায়।
   পাশাপাশি নাম্বার/ইমেইল সেভ রাখে, যাতে my-courses পেজে নিজে থেকেই কোর্স আসে। */
(function () {
  if (window.__hvbPayPatch) return;
  window.__hvbPayPatch = true;
  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (!origFetch) return;

  window.fetch = async function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (url.indexOf('/api/create-invoice') !== -1 && method === 'POST' && init && typeof init.body === 'string') {
        var payload = JSON.parse(init.body);
        if (payload && payload.course && payload.contact) {
          try { localStorage.setItem('hvb_contact', String(payload.contact)); } catch (e) {}
          if (!payload.access_token && window.HVBAuth && window.HVBAuth.sb) {
            try {
              var got = await window.HVBAuth.sb.auth.getSession();
              if (got && got.data && got.data.session) payload.access_token = got.data.session.access_token;
            } catch (e) {}
          }
          init = Object.assign({}, init, { body: JSON.stringify(payload) });
        }
      }
    } catch (e) {}
    return origFetch(input, init);
  };
})();
