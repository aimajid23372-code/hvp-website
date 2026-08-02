// HVB affiliate reference tracking (সব পেজে লোড হয়)
// ?ref=code পেলে ৩০ দিনের কুকি + localStorage দুই জায়গায় রাখে,
// তাই সাইট থেকে বের হয়ে আবার ঢুকলেও, বা অন্য পেজে গিয়ে কিনলেও রেফার কাজ করে।
(function () {
  var DAYS = 30;
  var KEY = 'hvb_ref';

  function setCookie(name, value, days) {
    try {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie =
        name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    } catch (e) {}
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return m ? decodeURIComponent(m[2]) : '';
    } catch (e) {
      return '';
    }
  }

  function valid(code) {
    return /^[a-z0-9_-]{3,30}$/.test(code);
  }

  function save(code) {
    setCookie(KEY, code, DAYS);
    try {
      localStorage.setItem(KEY, code);
      localStorage.setItem('hvb_ref_at', String(Date.now()));
    } catch (e) {}
  }

  // URL-এ ?ref= থাকলে সেভ করি
  try {
    var r = (new URLSearchParams(window.location.search).get('ref') || '').trim().toLowerCase();
    if (r && valid(r)) save(r);
  } catch (e) {}

  // কোথাও একটায় থাকলে অন্যটাতেও কপি করে রাখি (একটা মুছে গেলেও যেন থাকে)
  var fromCookie = getCookie(KEY);
  var fromLs = '';
  try {
    fromLs = localStorage.getItem(KEY) || '';
  } catch (e) {}
  var current = fromCookie || fromLs;
  if (current && valid(current)) save(current);

  window.hvbGetRef = function () {
    var c = getCookie(KEY);
    if (c && valid(c)) return c;
    try {
      var l = localStorage.getItem(KEY) || '';
      if (l && valid(l)) return l;
    } catch (e) {}
    return '';
  };
})();
