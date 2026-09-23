(function(){
  function isCourseLink(a){if(!a)return false;var u='';try{u=new URL(a.href,location.href);return u.origin===location.origin&&(/\/course(?:s|-short|-bundle)?(?:\.html)?$/.test(u.pathname)||u.pathname==='/course')}catch(e){return false}}
  function show(){var x=document.querySelector('.hvb-page-transition');if(!x){x=document.createElement('div');x.className='hvb-page-transition';x.setAttribute('aria-label','পৃষ্ঠা লোড হচ্ছে');x.innerHTML='<i></i>';document.body.appendChild(x)}requestAnimationFrame(function(){x.classList.add('show')})}
  document.addEventListener('click',function(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey)return;var a=e.target.closest('a');if(!isCourseLink(a)||a.target==='_blank'||a.hasAttribute('download'))return;e.preventDefault();if(a.dataset.loading==='1')return;a.dataset.loading='1';show();setTimeout(function(){location.href=a.href},160)},true);
  addEventListener('pageshow',function(){var x=document.querySelector('.hvb-page-transition');if(x)x.classList.remove('show');document.querySelectorAll('[data-loading]').forEach(function(a){delete a.dataset.loading})});
})();
