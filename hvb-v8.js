(function(){
  /* =========================================================
     v7 — UI এনহান্সমেন্ট
     ========================================================= */
  var BANNER = {
    bundle: '/banner-long-short.webp',
    short: '/banner-short.webp'
  };

  var CSS = [
    'header{padding:9px 16px !important;gap:10px}',
    'header .brand img,.brand img{width:34px !important;height:34px !important;border-radius:11px !important}',
    '.brand-text b{font-size:1.02em !important;letter-spacing:.16em !important}',
    '.brand-text span{display:none !important}',
    '.hvb-acc-actions{display:flex;align-items:center;gap:8px}',
    '.hvb-cta,.hvb-btn-accent.hvb-cta{padding:8px 14px !important;font-size:.84em !important;border-radius:10px !important}',
    '@media (max-width:820px){header nav .links{display:none !important}}',
    '@media (max-width:520px){header{padding:8px 12px !important}.brand-text b{font-size:.95em !important}',
    '.hvb-cta{padding:7px 12px !important;font-size:.79em !important}}',
    '.hvb-banner{position:relative;display:block;margin:18px 0 12px;border-radius:18px;overflow:hidden;',
    'border:1px solid rgba(120,200,255,.22);box-shadow:0 22px 50px -26px rgba(2,10,25,.9);background:#070b14}',
    '.hvb-banner img{display:block;width:100%;height:auto}',
    '.hvb-thumb-img{position:relative !important;overflow:hidden !important;background:#070b14 !important;',
    'height:auto !important;min-height:0 !important;padding:0 !important;display:block !important}',
    '.hvb-thumb-img::after{content:none !important}',
    '.hvb-thumb-img>img.hvb-bimg{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;',
    'transition:transform .5s cubic-bezier(.2,.8,.2,1)}',
    '.course-card:hover .hvb-bimg,.ccard:hover .hvb-bimg{transform:scale(1.045)}',
    '.hvb-thumb-img .play,.hvb-thumb-img .play-btn,.hvb-thumb-img button,.hvb-banner .play,'+
    '.hvb-banner button,.hvb-banner .play-btn{display:none !important}',
    '.hvb-thumb-img small{position:absolute;left:12px;bottom:12px;z-index:2}',
    '.price,.price b{color:#4FD3F5 !important;text-shadow:0 0 22px rgba(63,199,242,.28)}',
    '.price s{color:rgba(190,210,230,.55) !important;text-shadow:none}',
    '.hvb-clink{color:inherit;text-decoration:none;transition:color .2s ease}',
    '.hvb-clink:hover{color:var(--accent-2,#3FC7F2)}',
    '.hvb-emo{font-family:"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif;font-size:.92em;',
    'line-height:1;display:inline-block;vertical-align:-1px;filter:saturate(.86) contrast(1.02) ',
    'drop-shadow(0 1px 4px rgba(63,199,242,.28));opacity:.96}'
  ].join('');

  function injectCss() {
    if (document.getElementById('hvb-v7-css')) return;
    var s = document.createElement('style');
    s.id = 'hvb-v7-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
    (document.head || document.documentElement).appendChild(l);
  }

  function bannerFor(href) {
    if (!href) return '';
    if (href.indexOf('course-bundle') > -1) return BANNER.bundle;
    if (href.indexOf('course-short') > -1) return BANNER.short;
    return '';
  }

  function fillThumb(thumb, src, alt) {
    if (!thumb || thumb.querySelector('img.hvb-bimg')) return;
    var img = document.createElement('img');
    img.className = 'hvb-bimg';
    img.src = src;
    img.alt = alt || 'HVB কোর্স ব্যানার';
    img.loading = 'lazy';
    thumb.classList.add('hvb-thumb-img');
    thumb.insertBefore(img, thumb.firstChild);
  }

  function enhanceCards() {
    // হোমপেজ: পুরো কার্ডই লিংক
    Array.prototype.forEach.call(document.querySelectorAll('a.course-card'), function (a) {
      var src = bannerFor(a.getAttribute('href') || '');
      if (src) fillThumb(a.querySelector('.course-thumb'), src, (a.querySelector('h3') || {}).textContent);
    });

    // কোর্স পেজ লিস্ট: টাইটেলও ক্লিকেবল
    Array.prototype.forEach.call(document.querySelectorAll('article.ccard'), function (card) {
      var link = card.querySelector('a[href*="course-bundle"],a[href*="course-short"]');
      var href = link ? link.getAttribute('href').split('#')[0] : '';
      var src = bannerFor(href);
      if (!src) return;
      var thumb = card.querySelector('.cthumb');
      fillThumb(thumb, src, (card.querySelector('h3') || {}).textContent);
      if (thumb && !thumb.getAttribute('data-hvb-link')) {
        thumb.setAttribute('data-hvb-link', href);
        thumb.style.cursor = 'pointer';
      }
      var h3 = card.querySelector('h3');
      if (h3 && !h3.querySelector('a')) {
        var a = document.createElement('a');
        a.className = 'hvb-clink';
        a.href = href;
        a.textContent = h3.textContent;
        h3.textContent = '';
        h3.appendChild(a);
      }
      var body = card.querySelector('.cbody');
      var p = body ? body.querySelector('p') : null;
      if (p && !p.getAttribute('data-hvb-link')) {
        p.setAttribute('data-hvb-link', href);
        p.style.cursor = 'pointer';
      }
    });

    // ডিটেইল পেজে বড় ব্যানার
    var src = bannerFor(location.pathname);
    if (src && !document.querySelector('.hvb-banner')) {
      var poster = document.querySelector('.hvb-poster, .poster, .course-hero-thumb');
      var fig = document.createElement('figure');
      fig.className = 'hvb-banner';
      var im = document.createElement('img');
      im.src = src;
      im.alt = document.title;
      fig.appendChild(im);
      if (poster && poster.parentNode) {
        poster.parentNode.replaceChild(fig, poster);
      } else {
        var h1 = document.querySelector('h1');
        if (h1 && h1.parentNode) h1.parentNode.insertBefore(fig, h1.nextSibling);
      }
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-hvb-link]') : null;
    if (!t) return;
    if (e.target.closest('a,button')) return;
    location.href = t.getAttribute('data-hvb-link');
  });

  var EMOJI = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/;
  function classyEmoji(root) {
    var skip = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1 };
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !EMOJI.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (!p || skip[p.nodeName] || p.classList && p.classList.contains('hvb-emo')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(new RegExp(EMOJI.source, 'g'));
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (EMOJI.test(part) && part.length <= 3) {
          var s = document.createElement('span');
          s.className = 'hvb-emo';
          s.textContent = part;
          frag.appendChild(s);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function boot() {
    try { injectCss(); } catch (e) {}
    try { enhanceCards(); } catch (e) {}
    try { classyEmoji(document.body); } catch (e) {}
    setTimeout(function () { try { enhanceCards(); } catch (e) {} }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
