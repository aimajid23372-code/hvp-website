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
    return location.pathname.split('/').pop() || 'index.html';
  }
  function nextParam() {
    return encodeURIComponent(here() + location.search + location.hash);
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var LINKS = [
    { g: 'শেখা', items: [
      ['index.html', '🏠', 'হোম'],
      ['courses.html', '🎓', 'কোর্সসমূহ'],
      ['free-lesson.html', '🎁', 'ফ্রি লেসন'],
      ['my-courses.html', '📚', 'আমার কোর্স'],
    ]},
    { g: 'ইনকাম', items: [
      ['affiliate.html', '💰', 'অ্যাফিলিয়েট প্রোগ্রাম'],
      ['affiliate-dashboard.html', '📊', 'অ্যাফিলিয়েট ড্যাশবোর্ড'],
    ]},
    { g: 'প্রতিষ্ঠান', items: [
      ['about.html', 'ℹ️', 'আমাদের সম্পর্কে'],
      ['contact.html', '✉️', 'যোগাযোগ'],
      ['refund.html', '📄', 'রিফান্ড ও এক্সেস পলিসি'],
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
          '<a href="' + it[0] + '"' + (it[0] === here() ? ' class="active"' : '') + '>' +
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

    actions = document.createElement('div');
    actions.className = 'hvb-acc-actions';
    actions.innerHTML =
      '<button class="hvb-acc-login" type="button" id="hvbTopLogin">লগইন</button>' +
      '<button class="hvb-acc-signup" type="button" id="hvbTopSignup">সাইন আপ</button>' +
      '<button class="hvb-menu-btn" type="button" id="hvbMenuBtn" aria-label="মেনু">⋮</button>';

    var nav = header.querySelector('nav');
    (nav || header).appendChild(actions);

    actions.querySelector('#hvbMenuBtn').addEventListener('click', openDrawer);
    actions.querySelector('#hvbTopLogin').addEventListener('click', function () {
      go('login.html');
    });
    actions.querySelector('#hvbTopSignup').addEventListener('click', function () {
      go('login.html?mode=signup');
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
        actions.querySelector('#hvbTopLogin').style.display = 'none';
        actions.querySelector('#hvbTopSignup').style.display = 'none';
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
        '<div class="hvb-guest"><b>স্বাগতম 👋</b>' +
        '<p>লগইন করলে আপনার কেনা কোর্স যেকোনো ডিভাইসে নিজেই খুলে যাবে।</p>' +
        '<div class="row"><button class="hvb-acc-signup" type="button" id="hvbDrawerLogin">লগইন</button>' +
        '<button class="hvb-acc-login" style="display:block" type="button" id="hvbDrawerSignup">সাইন আপ</button></div></div>';
      block.querySelector('#hvbDrawerLogin').addEventListener('click', function () { go('login.html'); });
      block.querySelector('#hvbDrawerSignup').addEventListener('click', function () { go('login.html?mode=signup'); });
      foot.innerHTML = '<small>© ২০২৬ HVB — Hyper Vision Bangla</small>';
      if (actions) {
        var a = actions.querySelector('.hvb-avatar');
        if (a) a.remove();
        actions.querySelector('#hvbTopLogin').style.display = '';
        actions.querySelector('#hvbTopSignup').style.display = '';
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
      options: { redirectTo: location.origin + '/' + (nextUrl || 'my-courses.html') },
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
      if (p === 'my-courses.html' || p === 'affiliate-dashboard.html') location.href = 'index.html';
    })();
  }
  HVB.signOut = signOut;

  /* ---------------- লগইন গেট ---------------- */
  HVB.gate = function (fn) {
    HVB.whenReady(function () {
      if (!HVB.sb || HVB.user) return fn(); // লগইন বন্ধ থাকলে পুরোনো ফ্লো ঠিক থাকবে
      go('login.html');
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
      go('login.html');
    }
  }, true);

  function boot() {
    buildDrawer();
    buildHeaderActions();
    render();
    HVB.init();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
