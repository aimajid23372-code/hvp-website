/**
 * Hyper Vision Bangla (HVB) — Verified Reviews Cleaner & Supabase /api/my-access Helper
 * Preserves 100% of existing Supabase reviews while fixing legacy concatenated names
 * (e.g., "Mmd arifbundle" -> "Md Arif", "JJisan Ahmedai-kids-comedy" -> "Jisan Ahmed").
 */
(function (global) {
  'use strict';

  function cleanReviewerName(raw) {
    let s = String(raw || '').trim();
    s = s.replace(/(ai-kids-comedy|bundle|short|long)$/i, '').trim();
    s = s.replace(/^([A-Za-z])\1(?=[A-Za-z])/i, '$1');
    s = s.replace(/^9999/i, '').replace(/999/g, '').trim();
    return s.replace(/\s+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || 'Verified Student';
  }

  function detectCourseSlug(raw) {
    const s = String(raw || '').toLowerCase();
    if (s.endsWith('ai-kids-comedy')) return 'ai-kids-comedy';
    if (s.endsWith('short')) return 'short';
    if (s.endsWith('long')) return 'long';
    return 'bundle';
  }

  async function fetchLiveReviews() {
    try {
      const res = await fetch('/api/my-access?type=reviews');
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data)) return null;
      return data.map(function (r, i) {
        const raw = r.rawName || r.name || '';
        return {
          id: r.id || ('supa_' + i),
          name: cleanReviewerName(raw),
          rawName: raw,
          course: r.course || detectCourseSlug(raw),
          rating: Number(r.rating) || 5,
          text: r.text || r.comment || '',
          proofUrl: r.proofUrl || r.proof_url || ''
        };
      });
    } catch (e) {
      return null;
    }
  }

  global.HVBReviews = {
    cleanReviewerName: cleanReviewerName,
    detectCourseSlug: detectCourseSlug,
    fetchLiveReviews: fetchLiveReviews
  };
})(window);
