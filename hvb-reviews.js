/* =========================================================
   HVB Reviews — শুধু কোর্স কেনা শিক্ষার্থীরাই রিভিউ দিতে পারবে।
   ব্যবহার:  <div data-hvb-reviews="course-bundle"></div>
   course="all" দিলে সব কোর্সের রিভিউ দেখাবে।
   ========================================================= */
(function () {
  'use strict';

  var API = '/api/my-access';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function stars(n) {
    n = Math.round(Number(n) || 0);
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return s;
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }
  function initials(name, email) {
    var t = (name || email || 'H').trim();
    return t.charAt(0).toUpperCase();
  }

  function courseLabel(c) {
    return { 'course-bundle': 'ফুল কোর্স', 'course-short': 'শর্ট কোর্স', all: 'সব কোর্স' }[c] || c;
  }

  function render(root, course, data) {
    var items = (data && data.items) || [];
    var avg = data && data.avg ? Number(data.avg).toFixed(1) : '—';
    var count = (data && data.count) || 0;

    var summary =
      '<div class="hvb-rv-summary">' +
      '<div><div class="hvb-rv-score">' + avg + '</div>' +
      '<div class="hvb-rv-stars">' + stars(data && data.avg) + '</div></div>' +
      '<div><b>' + count + '</b> জন শিক্ষার্থীর যাচাইকৃত রিভিউ' +
      '<div style="font-size:.85em;color:var(--muted,#9AA5BF)">শুধু কোর্স কেনা অ্যাকাউন্ট থেকেই রিভিউ দেওয়া যায়</div></div>' +
      '</div>';

    var list = items.length
      ? '<div class="hvb-rv-grid">' + items.map(function (r) {
          var img = safeUrl(r.image_url);
          var lnk = safeUrl(r.link);
          return (
            '<article class="hvb-rv-card">' +
            '<div class="who"><span class="av">' + esc(initials(r.name, r.email)) + '</span>' +
            '<span><b>' + esc(r.name || 'HVB শিক্ষার্থী') + '</b>' +
            '<span>' + esc(courseLabel(r.course)) + '</span></span></div>' +
            '<div class="hvb-rv-stars">' + stars(r.rating) + '</div>' +
            '<p>' + esc(r.body) + '</p>' +
            (img ? '<img class="shot" loading="lazy" src="' + esc(img) + '" alt="শিক্ষার্থীর তৈরি কাজের স্ক্রিনশট">' : '') +
            (lnk ? '<a class="lnk" href="' + esc(lnk) + '" target="_blank" rel="nofollow noopener">' + esc(lnk) + '</a>' : '') +
            '<div style="margin-top:10px"><span class="hvb-rv-verified">যাচাইকৃত ক্রেতা</span></div>' +
            '</article>'
          );
        }).join('') + '</div>'
      : '<p style="color:var(--muted,#9AA5BF);font-size:.92em">এখনো কোনো রিভিউ যোগ হয়নি। কোর্স করা শিক্ষার্থী হলে প্রথম রিভিউটি আপনিই দিন।</p>';

    root.innerHTML =
      '<div class="hvb-rv">' +
      '<h2>শিক্ষার্থীদের রিভিউ</h2>' +
      '<p class="rv-sub">প্রতিটি রিভিউ পেমেন্ট-যাচাই করা অ্যাকাউন্ট থেকে দেওয়া — কোনো ভুয়া রিভিউ নেই।</p>' +
      summary +
      '<div id="hvbRvFormWrap"></div>' +
      list +
      '</div>';

    mountForm(root.querySelector('#hvbRvFormWrap'), course, function () {
      load(root, course);
    });
  }

  function loginPrompt(wrap) {
    wrap.innerHTML =
      '<div class="hvb-rv-form"><b style="font-family:Sora,sans-serif">রিভিউ দিতে চান?</b>' +
      '<p class="hvb-rv-note">রিভিউ শুধু কোর্স কেনা শিক্ষার্থীরাই দিতে পারেন। আগে লগইন করুন।</p>' +
      '<div style="margin-top:12px"><a class="hvb-btn-accent" href="/login">লগইন করুন</a></div></div>';
  }

  function notBuyer(wrap) {
    wrap.innerHTML =
      '<div class="hvb-rv-form"><b style="font-family:Sora,sans-serif">রিভিউ দেওয়ার সুযোগ</b>' +
      '<p class="hvb-rv-note">এই অ্যাকাউন্টে কোনো কেনা কোর্স পাওয়া যায়নি, তাই রিভিউ যোগ করা যাচ্ছে না। ' +
      'আগে ফোন নাম্বার দিয়ে কিনে থাকলে <a href="/login" style="color:var(--accent-2)">লগইন পেজ</a> থেকে পুরোনো কেনাটি অ্যাকাউন্টে যুক্ত করুন।</p></div>';
  }

  function formHtml(courses) {
    var opts = courses.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(courseLabel(c)) + '</option>';
    }).join('');
    return (
      '<form class="hvb-rv-form" id="hvbRvForm">' +
      '<b style="font-family:Sora,sans-serif">আপনার রিভিউ লিখুন</b>' +
      '<label>কোন কোর্স</label><select name="course">' + opts + '</select>' +
      '<label>রেটিং</label>' +
      '<div class="hvb-rv-pick" id="hvbRvStars">' +
      '<i data-v="1">★</i><i data-v="2">★</i><i data-v="3">★</i><i data-v="4">★</i><i data-v="5">★</i></div>' +
      '<label>অভিজ্ঞতা</label><textarea name="body" maxlength="1200" placeholder="কোর্স করে কী শিখলেন, কী উপকার হলো — সংক্ষেপে লিখুন" required></textarea>' +
      '<label>স্ক্রিনশট / ছবির লিংক (ঐচ্ছিক)</label>' +
      '<input name="image_url" type="url" placeholder="https://... (ছবির সরাসরি লিংক)">' +
      '<label>আপনার কাজের লিংক (ঐচ্ছিক)</label>' +
      '<input name="link" type="url" placeholder="https://... (YouTube/Facebook ভিডিও বা পেজ)">' +
      '<div style="margin-top:16px"><button class="hvb-btn-accent" type="submit" id="hvbRvSend">রিভিউ পাঠান</button></div>' +
      '<div class="hvb-rv-msg" id="hvbRvMsg"></div>' +
      '<p class="hvb-rv-note">ছবি আপলোড করতে চাইলে ছবিটি Google Drive/Imgur/Facebook-এ রেখে তার সরাসরি লিংক দিন।</p>' +
      '</form>'
    );
  }

  function mountForm(wrap, course, onDone) {
    if (!wrap) return;
    var A = window.HVBAuth;
    if (!A) return loginPrompt(wrap);
    A.whenReady(function () {
      if (!A.user) return loginPrompt(wrap);
      var token = A.session && A.session.access_token;
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var owned = (d && d.courses) || [];
          if (!owned.length) return notBuyer(wrap);
          var pick = course && course !== 'all' && owned.indexOf(course) > -1 ? [course] : owned;
          wrap.innerHTML = formHtml(pick);

          var rating = 5;
          var pickEl = wrap.querySelector('#hvbRvStars');
          function paint() {
            [].forEach.call(pickEl.children, function (i) {
              i.classList.toggle('on', Number(i.getAttribute('data-v')) <= rating);
            });
          }
          pickEl.addEventListener('click', function (e) {
            var v = e.target.getAttribute && e.target.getAttribute('data-v');
            if (v) { rating = Number(v); paint(); }
          });
          paint();

          wrap.querySelector('#hvbRvForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var f = e.target;
            var btn = f.querySelector('#hvbRvSend');
            var msg = f.querySelector('#hvbRvMsg');
            msg.className = 'hvb-rv-msg';
            msg.textContent = '';
            btn.classList.add('hvb-busy');
            fetch(API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: token,
                action: 'review_add',
                course: f.course.value,
                rating: rating,
                body: f.body.value,
                image_url: f.image_url.value,
                link: f.link.value,
                name: (A.user.user_metadata && A.user.user_metadata.full_name) || '',
              }),
            })
              .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
              .then(function (o) {
                btn.classList.remove('hvb-busy');
                if (!o.ok) throw new Error(o.j.error || 'পাঠানো যায়নি');
                msg.className = 'hvb-rv-msg ok';
                msg.textContent = o.j.msg || 'ধন্যবাদ! আপনার রিভিউ যোগ হয়েছে।';
                // Don't auto-reload immediately so user can read the message
                // setTimeout(onDone, 900);
              })
              .catch(function (err) {
                btn.classList.remove('hvb-busy');
                msg.className = 'hvb-rv-msg err';
                msg.textContent = err.message || 'সমস্যা হয়েছে, আবার চেষ্টা করুন।';
              });
          });
        })
        .catch(function () { loginPrompt(wrap); });
    });
  }

  function load(root, course) {
    root.innerHTML =
      '<div class="hvb-rv"><div class="hvb-skel" style="height:96px;margin-bottom:16px"></div>' +
      '<div class="hvb-skel" style="height:150px"></div></div>';
    fetch(API + '?reviews=' + encodeURIComponent(course || 'all'))
      .then(function (r) { return r.json(); })
      .then(function (d) { render(root, course, d); })
      .catch(function () { render(root, course, { items: [], count: 0 }); });
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-hvb-reviews]');
    [].forEach.call(nodes, function (n) { load(n, n.getAttribute('data-hvb-reviews')); });
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
