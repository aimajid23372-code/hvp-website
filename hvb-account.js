/* =========================================================
   HVB Account + Global Menu (nextgen-style)
   - সব পেজে একই হেডার মেনু (ড্রয়ার)
   - লগইন/সাইন আপ/প্রোফাইল/সাইন আউট
   - লগইন ছাড়া কোনো কেনার ধাপে গেলে আগে লগইন চাইবে
   ========================================================= */
(function () {
  'use strict';

  var CFG_URL = '/api/my-access?config=1';
  var SB_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  var HVB = (window.HVBAuth = {
    sb: null,
    session: null,
    user: null,
    ready: false,
    _waiters: [],
  });

  /* ---------------- স্টাইল ---------------- */
  var css = `
  .hvb-acc-actions{ display:flex; align-items:center; gap:10px; }
  .hvb-acc-login{
    background:transparent; border:1px solid var(--line,#242C42); color:var(--text,#EAF0FF);
    padding:9px 16px; border-radius:9px; font-size:.9em; font-weight:600; cursor:pointer;
    font-family:inherit; white-space:nowrap;
  }
  .hvb-acc-login:hover{ border-color:var(--cyan,#5EEAD4); color:var(--cyan,#5EEAD4); }
  .hvb-acc-signup{
    background:linear-gradient(90deg,var(--cyan,#5EEAD4),var(--violet,#A78BFA));
    color:#0A0D14; border:none; padding:9px 17px; border-radius:9px;
    font-size:.9em; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap;
  }
  .hvb-avatar{
    width:38px; height:38px; border-radius:50%; cursor:pointer; overflow:hidden;
    background:linear-gradient(135deg,var(--cyan,#5EEAD4),var(--violet,#A78BFA));
    color:#0A0D14; font-weight:800; font-size:.95em; border:none;
    display:flex; align-items:center; justify-content:center; font-family:inherit;
  }
  .hvb-avatar img{ width:100%; height:100%; object-fit:cover; }
  .hvb-menu-btn{
    background:var(--surface,#131826); border:1px solid var(--line,#242C42); color:var(--text,#EAF0FF);
    width:40px; height:40px; border-radius:10px; cursor:pointer; font-size:1.15em; line-height:1;
    display:flex; align-items:center; justify-content:center; font-family:inherit;
  }
  .hvb-menu-btn:hover{ border-color:var(--cyan,#5EEAD4); }

  .hvb-scrim{
    position:fixed; inset:0; background:rgba(4,6,12,.66); backdrop-filter:blur(3px);
    opacity:0; pointer-events:none; transition:opacity .22s ease; z-index:120;
  }
  .hvb-scrim.open{ opacity:1; pointer-events:auto; }

  .hvb-drawer{
    position:fixed; top:0; right:0; height:100%; width:330px; max-width:88vw; z-index:130;
    background:var(--bg-2,#0D1119); border-left:1px solid var(--line,#242C42);
    transform:translateX(104%); transition:transform .26s cubic-bezier(.4,0,.2,1);
    display:flex; flex-direction:column; overflow-y:auto;
    font-family:'Hind Siliguri',sans-serif; color:var(--text,#EAF0FF);
  }
  .hvb-drawer.open{ transform:translateX(0); }
  .hvb-drawer-top{
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 18px; border-bottom:1px solid var(--line,#242C42);
  }
  .hvb-drawer-top b{ font-family:'Sora',sans-serif; font-size:.95em; letter-spacing:.03em; }
  .hvb-x{
    background:transparent; border:none; color:var(--muted,#8891A8);
    font-size:1.25em; cursor:pointer; line-height:1; padding:4px 6px; font-family:inherit;
  }
  .hvb-x:hover{ color:var(--text,#EAF0FF); }

  .hvb-userblock{ padding:18px; border-bottom:1px solid var(--line,#242C42); }
  .hvb-userrow{ display:flex; align-items:center; gap:12px; }
  .hvb-userrow .av{
    width:44px; height:44px; border-radius:50%; flex:0 0 44px; overflow:hidden;
    background:linear-gradient(135deg,var(--cyan,#5EEAD4),var(--violet,#A78BFA));
    color:#0A0D14; font-weight:800; display:flex; align-items:center; justify-content:center;
  }
  .hvb-userrow .av img{ width:100%; height:100%; object-fit:cover; }
  .hvb-userrow .who{ min-width:0; }
  .hvb-userrow .who b{ display:block; font-size:.95em; }
  .hvb-userrow .who span{
    display:block; font-size:.78em; color:var(--muted,#8891A8);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;
  }
  .hvb-guest p{ color:var(--muted,#8891A8); font-size:.85em; margin:0 0 14px; }
  .hvb-guest b{ display:block; font-family:'Sora',sans-serif; margin-bottom:6px; }
  .hvb-guest .row{ display:flex; gap:10px; }
  .hvb-guest .row button{ flex:1; }

  .hvb-nav{ display:block; padding:12px 10px 4px; }
  .hvb-nav h6{ margin:0; font-family:inherit;
    font-size:.68em; letter-spacing:.14em; text-transform:uppercase;
    color:var(--muted,#8891A8); padding:12px 12px 6px; font-weight:600;
  }
  .hvb-nav a{
    display:flex; align-items:center; gap:11px; padding:11px 12px; border-radius:9px;
    font-size:.93em; color:#c9d2e6; text-decoration:none;
  }
  .hvb-nav a i{ font-style:normal; width:20px; text-align:center; opacity:.9; }
  .hvb-nav a:hover{ background:var(--surface,#131826); color:var(--text,#EAF0FF); }
  .hvb-nav a.active{ background:rgba(94,234,212,.10); color:var(--cyan,#5EEAD4); }
  .hvb-drawer-foot{ margin-top:auto; padding:14px 18px 22px; border-top:1px solid var(--line,#242C42); }
  .hvb-signout{
    width:100%; background:transparent; border:1px solid var(--line,#242C42);
    color:#ff9b9b; padding:11px; border-radius:9px; font-size:.9em; font-weight:600;
    cursor:pointer; font-family:inherit;
  }
  .hvb-signout:hover{ border-color:#ff9b9b; }
  .hvb-drawer-foot small{ display:block; color:var(--muted,#8891A8); font-size:.74em; margin-top:12px; text-align:center; }
  @media (max-width:520px){ .hvb-acc-login{ display:none; } }
  `;
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------------- হেল্পার ---------------- */
  function here() {
    var last = location.pathname.split('/').pop() || '';
    last = last.replace(/\.html$/i, '');
    return last || 'index';
  }
  function nextParam() {
    return encodeURIComponent(here() + location.search + location.hash);
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function ic(d) {
    return (
      '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'
    );
  }
  var IC = {
    home: ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/>'),
    cap: ic('<path d="M2 8l10-4 10 4-10 4L2 8z"/><path d="M6 10.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-6.5"/>'),
    gift: ic('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8s-1-4-4-4a2.4 2.4 0 0 0 0 4zM12 8s1-4 4-4a2.4 2.4 0 0 1 0 4z"/>'),
    book: ic('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/>'),
    star: ic('<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.5 9.8l5.9-.8z"/>'),
    coin: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.4 9.4h4a1.9 1.9 0 0 1 0 3.8h-3.8a1.9 1.9 0 0 0 0 3.8h4.4"/>'),
    chart: ic('<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 17v-5M12.5 17V8M17 17v-8"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>'),
    mail: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>'),
    doc: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  };

  var LINKS = [
    { g: 'শেখা', items: [
      ['index', IC.home, 'হোম'],
      ['courses', IC.cap, 'কোর্সসমূহ'],
      ['free-lesson', IC.gift, 'ফ্রি লেসন'],
      ['my-courses', IC.book, 'আমার কোর্স'],
      ['reviews', IC.star, 'শিক্ষার্থীদের রিভিউ'],
    ]},
    { g: 'ইনকাম', items: [
      ['affiliate', IC.coin, 'অ্যাফিলিয়েট প্রোগ্রাম'],
      ['affiliate-dashboard', IC.chart, 'অ্যাফিলিয়েট ড্যাশবোর্ড'],
    ]},
    { g: 'প্রতিষ্ঠান', items: [
      ['about', IC.info, 'আমাদের সম্পর্কে'],
      ['contact', IC.mail, 'যোগাযোগ'],
      ['refund', IC.doc, 'এক্সেস ও রিফান্ড পলিসি'],
    ]},
  ];

  /* ---------------- UI তৈরি ---------------- */
  var scrim, drawer, actions;

  function buildDrawer() {
    scrim = document.createElement('div');
    scrim.className = 'hvb-scrim';
    scrim.addEventListener('click', closeDrawer);

    drawer = document.createElement('aside');
    drawer.className = 'hvb-drawer';
    drawer.setAttribute('aria-label', 'মেনু');

    var nav = '';
    LINKS.forEach(function (grp) {
      nav += '<h6>' + grp.g + '</h6>';
      grp.items.forEach(function (it) {
        nav +=
          '<a href="/' + (it[0] === 'index' ? '' : it[0]) + '"' + (it[0] === here() ? ' class="active"' : '') + '>' +
          '<i>' + it[1] + '</i>' + it[2] + '</a>';
      });
    });

    drawer.innerHTML =
      '<div class="hvb-drawer-top"><b>HVB মেনু</b>' +
      '<button class="hvb-x" type="button" aria-label="বন্ধ করুন">✕</button></div>' +
      '<div class="hvb-userblock" id="hvbUserBlock"></div>' +
      '<div class="hvb-nav">' + nav + '</div>' +
      '<div class="hvb-drawer-foot" id="hvbDrawerFoot">' +
      '<small>© ২০২৬ HVB — Hyper Vision Bangla</small></div>';

    drawer.querySelector('.hvb-x').addEventListener('click', closeDrawer);
    document.body.appendChild(scrim);
    document.body.appendChild(drawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  function openDrawer() {
    scrim.classList.add('open');
    drawer.classList.add('open');
  }
  function closeDrawer() {
    scrim.classList.remove('open');
    drawer.classList.remove('open');
  }

  function buildHeaderActions() {
    var header = document.querySelector('header');
    if (!header) return;
    // পুরোনো ৩-ডট মেনু সরিয়ে নতুন ড্রয়ার ব্যবহার
    var old = header.querySelector('.dots-wrap');
    if (old) old.remove();
    // পেজের নিজের পুরোনো হেডার CTA সরিয়ে একটাই অ্যাকসেন্ট বাটন রাখি
    header.querySelectorAll(
      '.btn-primary, .btn-ghost, a[href="/login"], a[href="/my-courses"]'
    ).forEach(function (el) { el.remove(); });

    actions = document.createElement('div');
    actions.className = 'hvb-acc-actions';
    actions.innerHTML =
      '<button class="hvb-btn-accent hvb-cta" type="button" id="hvbTopCta">শুরু করুন</button>' +
      '<button class="hvb-menu-btn" type="button" id="hvbMenuBtn" aria-label="মেনু">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';

    var nav = header.querySelector('nav');
    (nav || header).appendChild(actions);

    actions.querySelector('#hvbMenuBtn').addEventListener('click', openDrawer);
    actions.querySelector('#hvbTopCta').addEventListener('click', function () {
      if (HVB.user) location.href = '/my-courses';
      else go('/login');
    });
  }

  function go(base) {
    location.href = base + (base.indexOf('?') > -1 ? '&' : '?') + 'next=' + nextParam();
  }

  /* ---------------- রেন্ডার ---------------- */
  function render() {
    var u = HVB.user;
    var block = document.getElementById('hvbUserBlock');
    var foot = document.getElementById('hvbDrawerFoot');
    if (!block) return;

    if (u) {
      var email = u.email || '';
      var name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || email.split('@')[0];
      var pic = (u.user_metadata && (u.user_metadata.avatar_url || u.user_metadata.picture)) || '';
      block.innerHTML =
        '<div class="hvb-userrow"><div class="av">' +
        (pic ? '<img src="' + esc(pic) + '" alt="">' : esc((name || 'H').charAt(0).toUpperCase())) +
        '</div><div class="who"><b>' + esc(name) + '</b><span>' + esc(email) + '</span></div></div>';

      foot.innerHTML =
        '<button class="hvb-signout" type="button" id="hvbSignOut">সাইন আউট</button>' +
        '<small>© ২০২৬ HVB — Hyper Vision Bangla</small>';
      foot.querySelector('#hvbSignOut').addEventListener('click', signOut);

      if (actions) {
        var cta = actions.querySelector('#hvbTopCta');
        if (cta) cta.textContent = 'আমার কোর্স';
        if (!actions.querySelector('.hvb-avatar')) {
          var av = document.createElement('button');
          av.type = 'button';
          av.className = 'hvb-avatar';
          av.title = email;
          av.setAttribute('aria-label', 'প্রোফাইল');
          av.innerHTML = pic ? '<img src="' + esc(pic) + '" alt="">' : esc((name || 'H').charAt(0).toUpperCase());
          av.addEventListener('click', openDrawer);
          actions.insertBefore(av, actions.firstChild);
        }
      }
    } else {
      block.innerHTML =
        '<div class="hvb-guest"><b>স্বাগতম</b>' +
        '<p>লগইন করলে আপনার কেনা কোর্স যেকোনো ডিভাইস থেকে নিজেই খুলে যাবে।</p>' +
        '<div class="row"><button class="hvb-btn-accent" type="button" id="hvbDrawerLogin">লগইন</button>' +
        '<button class="hvb-btn-quiet" type="button" id="hvbDrawerSignup">সাইন আপ</button></div></div>';
      block.querySelector('#hvbDrawerLogin').addEventListener('click', function () { go('/login'); });
      block.querySelector('#hvbDrawerSignup').addEventListener('click', function () { go('/login?mode=signup'); });
      foot.innerHTML = '<small>© ২০২৬ HVB — Hyper Vision Bangla</small>';
      if (actions) {
        var a = actions.querySelector('.hvb-avatar');
        if (a) a.remove();
        var cta2 = actions.querySelector('#hvbTopCta');
        if (cta2) cta2.textContent = 'শুরু করুন';
      }
    }
  }

  /* ---------------- Supabase ---------------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.supabase) return res();
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  HVB.init = async function () {
    try {
      var cfg = await (await fetch(CFG_URL)).json();
      if (!cfg || !cfg.enabled) throw new Error('auth off');
      await loadScript(SB_CDN);
      HVB.sb = window.supabase.createClient(cfg.url, cfg.anonKey);
      var got = await HVB.sb.auth.getSession();
      HVB.session = (got.data && got.data.session) || null;
      HVB.user = HVB.session ? HVB.session.user : null;
      HVB.sb.auth.onAuthStateChange(function (_e, s) {
        HVB.session = s || null;
        HVB.user = s ? s.user : null;
        render();
      });
    } catch (e) {
      HVB.sb = null;
    }
    HVB.ready = true;
    render();
    HVB._waiters.splice(0).forEach(function (fn) { fn(); });
  };

  HVB.whenReady = function (fn) {
    HVB.ready ? fn() : HVB._waiters.push(fn);
  };

  HVB.signInWithGoogle = async function (nextUrl) {
    if (!HVB.sb) await HVB.init();
    if (!HVB.sb) return false;
    await HVB.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + '/' + String(nextUrl || 'my-courses').replace(/^\//, '').replace(/\.html$/i, '') },
    });
    return true;
  };

  function signOut() {
    (async function () {
      if (HVB.sb) await HVB.sb.auth.signOut();
      HVB.session = null;
      HVB.user = null;
      render();
      closeDrawer();
      var p = here();
      if (p === 'my-courses' || p === 'affiliate-dashboard' || p === 'admin') location.href = '/';
    })();
  }
  HVB.signOut = signOut;

  /* ---------------- লগইন গেট ---------------- */
  HVB.gate = function (fn) {
    HVB.whenReady(function () {
      if (!HVB.sb || HVB.user) return fn(); // লগইন বন্ধ থাকলে পুরোনো ফ্লো ঠিক থাকবে
      go('/login');
    });
  };
  window.hvbGate = HVB.gate;

  /* data-hvb-gate থাকা লিংক/বাটনে অটো গেট */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-hvb-gate]');
    if (!el) return;
    if (!HVB.ready) { e.preventDefault(); HVB.gate(function () { el.click(); }); return; }
    if (HVB.sb && !HVB.user) {
      e.preventDefault();
      e.stopPropagation();
      go('/login');
    }
  }, true);

  /* ---------------- মাইক্রো-ইন্টারঅ্যাকশন + লোডিং ---------------- */
  function mountUiLayer() {
    if (!document.getElementById('hvbProgress')) {
      var bar = document.createElement('div');
      bar.id = 'hvbProgress';
      document.body.appendChild(bar);
      var loader = document.createElement('div');
      loader.id = 'hvbLoader';
      loader.innerHTML = '<div class="hvb-spin"></div><small>একটু অপেক্ষা করুন…</small>';
      document.body.appendChild(loader);
    }
    var bar = document.getElementById('hvbProgress');
    var pending = 0, width = 0, timer = null;

    function start() {
      pending++;
      if (pending > 1) return;
      width = 8; bar.classList.add('on'); bar.style.width = '8%';
      timer = setInterval(function () {
        width = Math.min(92, width + (92 - width) * 0.12 + 1);
        bar.style.width = width.toFixed(1) + '%';
      }, 220);
    }
    function done() {
      pending = Math.max(0, pending - 1);
      if (pending) return;
      clearInterval(timer);
      bar.style.width = '100%';
      setTimeout(function () { bar.classList.remove('on'); bar.style.width = '0'; }, 320);
    }
    HVB.loadStart = start;
    HVB.loadDone = done;
    HVB.overlay = function (on) {
      document.getElementById('hvbLoader').classList.toggle('on', !!on);
    };

    var origFetch = window.fetch;
    if (origFetch && !origFetch.__hvb) {
      var wrapped = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var track = url.indexOf('/api/') > -1;
        if (track) start();
        var pr = origFetch.apply(this, arguments);
        return track ? pr.then(function (r) { done(); return r; }, function (e) { done(); throw e; }) : pr;
      };
      wrapped.__hvb = true;
      window.fetch = wrapped;
    }

    /* ক্লিকে ripple */
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.hvb-btn-accent, .hvb-btn-quiet, .btn-primary, .buy-btn');
      if (!b) return;
      var rect = b.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var sp = document.createElement('span');
      sp.className = 'hvb-ripple';
      sp.style.width = sp.style.height = size + 'px';
      sp.style.left = (e.clientX - rect.left - size / 2) + 'px';
      sp.style.top = (e.clientY - rect.top - size / 2) + 'px';
      if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
      b.style.overflow = 'hidden';
      b.appendChild(sp);
      setTimeout(function () { sp.remove(); }, 620);
    });

    /* স্ক্রল রিভিল */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      document.querySelectorAll('.hvb-reveal').forEach(function (el) { io.observe(el); });
    }
  }

  function boot() {
    mountUiLayer();
    buildDrawer();
    buildHeaderActions();
    render();
    HVB.init();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
