(function(){
  function safeColor(v,f){return /^#[0-9a-f]{6}$/i.test(v||'')?v:f}
  function text(sel,v){var e=document.querySelector(sel);if(e&&v)e.textContent=v}
  function visible(sel,on){document.querySelectorAll(sel).forEach(function(e){e.style.display=on===false?'none':''})}
  fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'settings_get'})}).then(function(r){return r.json()}).then(function(d){
    var s=d.settings||{},r=document.documentElement;
    if(s.announcement&&typeof s.announcement==='object'){if(s.announcement_enabled==null)s.announcement_enabled=s.announcement.active===false?'0':'1';s.announcement=String(s.announcement.text||'')}
    r.style.setProperty('--cyan',safeColor(s.color_primary,'#3FC7F2'));r.style.setProperty('--violet',safeColor(s.color_secondary,'#7C6BF5'));r.style.setProperty('--bg',safeColor(s.color_background,'#07111E'));r.style.setProperty('--surface',safeColor(s.color_surface,'#132239'));
    text('.brand-text b',s.site_name);text('.hero h1',s.home_hero_title);text('.hero p.sub',s.home_hero_subtitle);text('.hero-actions .btn-primary',s.home_cta_label);
    if(s.logo_url)document.querySelectorAll('.brand img').forEach(function(i){i.src=s.logo_url});
    if(s.home_hero_image){var hero=document.querySelector('.hero');if(hero){hero.style.backgroundImage='linear-gradient(rgba(7,17,30,.72),rgba(7,17,30,.88)),url("'+s.home_hero_image.replace(/["\\]/g,'')+'")';hero.style.backgroundSize='cover';hero.style.backgroundPosition='center'}}
    if(location.pathname==='/'||location.pathname==='/index.html'){visible('#courses',s.home_show_courses!=='0');visible('#reviews',s.home_show_reviews!=='0');visible('#faq',s.home_show_faq!=='0');if(s.seo_home_title)document.title=s.seo_home_title;var md=document.querySelector('meta[name=description]');if(md&&s.seo_home_description)md.content=s.seo_home_description}
    var isHome=(location.pathname==='/'||location.pathname==='/index.html'||location.pathname==='/index');
    if(isHome&&s.announcement_enabled!=='0'&&s.announcement){var bar=document.createElement('div');bar.textContent=s.announcement;bar.style.cssText='position:relative;z-index:80;padding:9px 16px;text-align:center;background:linear-gradient(90deg,var(--cyan),var(--violet));color:#07111e;font-weight:700';document.body.insertBefore(bar,document.body.firstChild)}
    if(s.footer_text)document.querySelectorAll('footer').forEach(function(f){var first=f.childNodes[0];if(first&&first.nodeType===3)first.textContent=s.footer_text+' · '});
    if(s.faq_heading){text('#faq .section-head h2',s.faq_heading);document.querySelectorAll('.faq').forEach(function(f){var h=f.previousElementSibling;if(h&&/^H[1-6]$/.test(h.tagName))h.textContent=s.faq_heading})}
    document.querySelectorAll('#faq .faq-item').forEach(function(item,i){var n=i+1,q=s['faq_'+n+'_q'],a=s['faq_'+n+'_a'];if(q)text('.faq-title',q);if(a)text('.faq-body',a)});
    if(s.refund_summary)document.querySelectorAll('#refund .hvb-policy-box p:first-of-type').forEach(function(e){e.textContent=s.refund_summary});
    if(s.messenger_link)document.querySelectorAll('a[href*="m.me/hypervisionbangla"]').forEach(function(a){a.href=s.messenger_link;if(s.support_label&&a.classList.contains('hvb-msgr-float'))a.lastChild.textContent=' '+s.support_label});
    if(s.course_cta_label)document.querySelectorAll('.btn-primary[data-hvb-gate]').forEach(function(b){b.textContent=s.course_cta_label});
    visible('[data-hvb-reviews]',s.course_show_reviews!=='0');
    if(s.favicon_url){var f=document.querySelector('link[rel="icon"]')||document.createElement('link');f.rel='icon';f.href=s.favicon_url;document.head.appendChild(f)}
  }).catch(function(){})
})();

