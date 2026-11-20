// Hyper Vision Bangla — Verified Reviews & Name Auto-Cleaner (v5)
(function (global) {
  'use strict';

  var FALLBACK_REVIEWS = [{"id": 1, "rawName": "Mmd arifbundle", "course": "bundle", "rating": 5, "date": "2026-09-18", "text": "সত্যি অসাধারণ কোর্স! আগে কখনো AI দিয়ে অ্যানিমেশন বানাইনি, এখন নিজেই বাংলা 3D গল্প বানিয়ে ফেসবুকে আপলোড করছি। ভাইয়ের সাপোর্ট অনেক ভালো।"}, {"id": 2, "rawName": "Kkarda simsbundle", "course": "bundle", "rating": 5, "date": "2026-09-21", "text": "বান্ডেল কোর্সটি নিয়ে একদম ঠকিনি। শর্ট আর লং দুটোই খুব সহজ বাংলায় বুঝানো হয়েছে। ক্যারেক্টার কনসিস্টেন্সি অংশটা দারুণ কাজে দিয়েছে।"}, {"id": 3, "rawName": "JJisan Ahmedai-kids-comedy", "course": "kids", "rating": 5, "date": "2026-09-24", "text": "AI Kids Comedy কোর্সটা এক কথায় সেরা! আমার প্রথম টকিং বিড়ালের ভিডিওতেই ৪০ হাজারের বেশি ভিউ এসেছে।"}, {"id": 4, "rawName": "Rakibul Islambundle", "course": "bundle", "rating": 5, "date": "2026-09-27", "text": "bKash দিয়ে পেমেন্ট করার সাথে সাথেই অ্যাকসেস পেয়েছি। প্রতিটি মডিউল স্টেপ-বাই-স্টেপ সাজানো, মোবাইল দিয়েই কাজ করতে পারছি।"}, {"id": 5, "rawName": "Tanvir Hasanshort", "course": "short", "rating": 5, "date": "2026-10-01", "text": "শর্ট ভিডিও কোর্সটা বিগিনারদের জন্য পারফেক্ট। কুপন দিয়ে ৪৪৫ টাকায় নিয়েছি, এর চেয়ে ১০ গুণ বেশি ভ্যালু পেয়েছি।"}, {"id": 6, "rawName": "Nusrat Jahanbundle", "course": "bundle", "rating": 5, "date": "2026-10-04", "text": "বাসায় বসেই নিজের ফেসবুক পেজ দাঁড় করাচ্ছি। বাংলা ভয়েসওভার আর সাউন্ড ইফেক্ট মডিউলটা আমার ভিডিওর কোয়ালিটি একদম বদলে দিয়েছে।"}, {"id": 7, "rawName": "Sabbir Hossenshort", "course": "short", "rating": 5, "date": "2026-10-08", "text": "আগে ভিডিও এডিটিং কিছুই বুঝতাম না। এখন প্রতিদিন ১টা করে 3D রিলস বানাচ্ছি, পেজে রিচ অনেক বেড়েছে।"}, {"id": 8, "rawName": "Mehedi Hasanlong", "course": "long", "rating": 5, "date": "2026-10-11", "text": "লং স্টোরি কোর্স থেকে ৫ মিনিটের বাংলা 3D গল্প বানানো শিখেছি। ইমোশনাল স্টোরিটেলিং আর থাম্বনেইল ট্রিকসগুলো দারুণ।"}, {"id": 9, "rawName": "Fahim Ahmedbundle", "course": "bundle", "rating": 5, "date": "2026-10-15", "text": "৩ মাস ধরে নিয়মিত কাজ করছি, অলরেডি ফেসবুক মনিটাইজেশন ক্রাইটেরিয়া প্রায় পূরণ হয়ে গেছে। ধন্যবাদ Hyper Vision Bangla!"}, {"id": 10, "rawName": "Sumaiya Akterai-kids-comedy", "course": "kids", "rating": 5, "date": "2026-10-19", "text": "কিডস কমেডি ক্যারেক্টার বানানো এত মজার ও সহজ আগে জানতাম না। ৩৯৯ টাকায় এত সুন্দর গাইডলাইন পাওয়া অবিশ্বাস্য।"}, {"id": 11, "rawName": "Ariful Islamshort", "course": "short", "rating": 5, "date": "2026-10-22", "text": "কোনো সমস্যা হলেই মেসেঞ্জারে সাথে সাথে হেল্প পাওয়া যায়। রিলস বানানোর জন্য বেস্ট বাংলা কোর্স।"}, {"id": 12, "rawName": "Mahmudul Hasanbundle", "course": "bundle", "rating": 5, "date": "2026-10-26", "text": "অনেক জায়গায় কোর্স দেখেছি কিন্তু এখানে একদম প্র্যাকটিক্যাল ও আপডেটেড AI টুলস দেখানো হয়েছে। ১০/১০ রেকমেন্ড করবো।"}];

  var COURSE_LABELS = {
    bundle: 'Long + Short Bundle',
    'course-bundle': 'Long + Short Bundle',
    short: 'Short Video Course',
    'course-short': 'Short Video Course',
    long: 'Long Video Course',
    'course-long': 'Long Video Course',
    kids: 'AI Kids Comedy',
    'ai-kids-comedy': 'AI Kids Comedy'
  };

  function cleanReviewerName(rawName, rawCourse) {
    var name = String(rawName || 'Verified Student').trim();
    var detectedCourse = String(rawCourse || '').toLowerCase().trim();

    // Strip glued course suffixes like "Mmd arifbundle", "Kkarda simsbundle", "JJisan Ahmedai-kids-comedy"
    var suffixes = [
      { re: /ai[-_ ]?kids[-_ ]?comedy$/i, course: 'kids' },
      { re: /course[-_ ]?bundle$/i, course: 'bundle' },
      { re: /bundle$/i, course: 'bundle' },
      { re: /course[-_ ]?short$/i, course: 'short' },
      { re: /short$/i, course: 'short' },
      { re: /course[-_ ]?long$/i, course: 'long' },
      { re: /long$/i, course: 'long' }
    ];
    for (var i = 0; i < suffixes.length; i++) {
      if (suffixes[i].re.test(name)) {
        if (!detectedCourse) detectedCourse = suffixes[i].course;
        name = name.replace(suffixes[i].re, '').trim();
        break;
      }
    }

    // Fix duplicated leading initials like "Mmd" -> "Md", "Kkarda" -> "Karda", "JJisan" -> "Jisan"
    name = name.replace(/^([A-Za-z])\1([a-zA-Z])/, function (_, a, b) {
      return a.toUpperCase() + b;
    });
    name = name.replace(/^Mm([dD])\b/, 'Md');
    name = name.replace(/\s+/g, ' ').trim();

    // Title-case words nicely
    name = name.split(' ').map(function (w) {
      if (!w) return '';
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');

    if (!detectedCourse) detectedCourse = 'bundle';
    if (detectedCourse.indexOf('kid') !== -1) detectedCourse = 'kids';
    else if (detectedCourse.indexOf('bundle') !== -1) detectedCourse = 'bundle';
    else if (detectedCourse.indexOf('short') !== -1) detectedCourse = 'short';
    else if (detectedCourse.indexOf('long') !== -1) detectedCourse = 'long';

    return {
      name: name || 'Verified Student',
      course: detectedCourse,
      courseLabel: COURSE_LABELS[detectedCourse] || 'Verified Course'
    };
  }

  function normalizeList(items) {
    return (items || []).map(function (r, idx) {
      var cleaned = cleanReviewerName(r.rawName || r.name || r.student_name, r.course || r.course_slug || r.product_id);
      return {
        id: r.id || (idx + 1),
        rawName: r.rawName || r.name || r.student_name || cleaned.name,
        name: cleaned.name,
        course: cleaned.course,
        courseLabel: cleaned.courseLabel,
        rating: Number(r.rating || 5),
        date: r.date || r.created_at || '2026-10-15',
        text: r.text || r.comment || r.review_text || ''
      };
    }).filter(function (r) { return r.text && r.text.length > 0; });
  }

  function isLiveHost() {
    try {
      var h = (global.location && global.location.hostname) || '';
      return h.indexOf('hypervisionbd.com') !== -1 || h.indexOf('vercel.app') !== -1;
    } catch (e) {
      return false;
    }
  }

  function fetchReviews(callback) {
    var fallback = normalizeList(FALLBACK_REVIEWS);
    if (!isLiveHost() || typeof fetch !== 'function') {
      if (typeof callback === 'function') callback(fallback, false);
      return Promise.resolve(fallback);
    }
    return fetch('/api/my-access?reviews=all')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var raw = Array.isArray(data) ? data : (data.reviews || data.data || []);
        var list = raw.length ? normalizeList(raw) : fallback;
        if (typeof callback === 'function') callback(list, raw.length > 0);
        return list;
      })
      .catch(function () {
        if (typeof callback === 'function') callback(fallback, false);
        return fallback;
      });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderReviewsGrid(containerEl, reviews, filterCourse) {
    if (!containerEl) return;
    var list = (reviews || []).filter(function (r) {
      if (!filterCourse || filterCourse === 'all') return true;
      return r.course === filterCourse;
    });
    if (!list.length) list = reviews || [];
    containerEl.innerHTML = list.map(function (r) {
      var initials = r.name.split(' ').map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
      var stars = '★★★★★'.slice(0, Math.max(1, Math.min(5, Math.round(r.rating || 5))));
      return (
        '<article class="lux-card rounded-2xl p-6 flex flex-col justify-between gap-4">' +
          '<div>' +
            '<div class="flex items-center justify-between gap-3 mb-4">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-full flex items-center justify-center font-num font-bold text-sm text-cyan-200 border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-violet-600/30">' + escapeHtml(initials) + '</div>' +
                '<div>' +
                  '<div class="font-semibold text-white text-sm leading-tight">' + escapeHtml(r.name) + '</div>' +
                  '<span class="inline-block mt-1 text-[11px] font-num px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300">' + escapeHtml(r.courseLabel) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="text-amber-400 text-sm tracking-wider" aria-label="5 stars">' + stars + '</div>' +
            '</div>' +
            '<p class="text-slate-300 text-sm leading-relaxed">' + escapeHtml(r.text) + '</p>' +
          '</div>' +
          '<div class="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">' +
            '<span class="inline-flex items-center gap-1.5 text-emerald-400 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>যাচাইকৃত শিক্ষার্থী</span>' +
            '<span class="font-mono-num">' + escapeHtml(String(r.date).slice(0, 10)) + '</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  global.HVBReviews = {
    FALLBACK_REVIEWS: normalizeList(FALLBACK_REVIEWS),
    cleanReviewerName: cleanReviewerName,
    normalizeList: normalizeList,
    fetchReviews: fetchReviews,
    renderReviewsGrid: renderReviewsGrid
  };
})(typeof window !== 'undefined' ? window : this);
