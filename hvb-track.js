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

  function ref() {
    try {
      if (typeof window.hvbGetRef === 'function') return window.hvbGetRef();
      return localStorage.getItem('hvb_ref') || '';
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
