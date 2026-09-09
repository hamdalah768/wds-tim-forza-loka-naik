(() => {
  'use strict';
  const L=window.Loka, {$,$$}=L, dialog=$('#auth-dialog');
  let opener=null, previousHash='', frame=0;
  function openAccount(push=true){
    if(dialog.open)return;
    opener=document.activeElement;previousHash=location.hash==='#akun'?'':location.hash;
    if(push && location.hash!=='#akun')history.pushState(null,'',location.pathname+location.search+'#akun');
    dialog.showModal();
    document.dispatchEvent(new Event('loka:authopen'));
  }
  function closeAccount(){if(dialog.open)dialog.close();}
  document.addEventListener('loka:requestlogin',()=>openAccount());
  dialog.addEventListener('close',()=>{
    if(location.hash==='#akun')history.replaceState(null,'',location.pathname+location.search+(previousHash||'#beranda'));
    opener?.focus({preventScroll:true});
  });
  function scrollToPart(hash,focus=false){
    const node=document.getElementById(hash.slice(1));if(!node)return false;
    if(node.tagName==='DETAILS')node.open=true;
    if(dialog.open)closeAccount();
    node.scrollIntoView({behavior:L.reduced()?'instant':'smooth',block:'start'});
    if(focus){const input=$('#search-query');input?.focus({preventScroll:true});}
    return true;
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a,button');if(!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button!==undefined&&e.button!==0))return;
    const href=a.getAttribute('href');
    if(a.hasAttribute('data-open-auth') || href==='#akun'){e.preventDefault();openAccount();return;}
    if(a.hasAttribute('data-open-search')){
      e.preventDefault();history.pushState(null,'',location.pathname+location.search+'#pencarian');scrollToPart('#pencarian',true);return;
    }
    if(href?.startsWith('#') && href.length>1){
      if(!document.getElementById(href.slice(1)))return;
      e.preventDefault();if(dialog.open)closeAccount();
      if(location.hash!==href)history.pushState(null,'',location.pathname+location.search+href);
      scrollToPart(href);
    }
  });
  function followUrl(){
    if(location.hash==='#akun')openAccount(false);
    else {closeAccount();if(location.hash)scrollToPart(location.hash);}
  }
  addEventListener('popstate',followUrl);addEventListener('hashchange',followUrl);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();if(dialog.open)closeAccount();
      history.pushState(null,'',location.pathname+location.search+'#pencarian');scrollToPart('#pencarian',true);
    }
  });
  const points=[['beranda','beranda'],['bagian-posisi','belajar'],['bagian-reflektor','belajar'],['bagian-sudut','belajar'],['belajar','belajar'],['pencarian','pencarian'],['studio','studio'],['cerita','cerita'],['privasi','cerita'],['sumber','cerita'],['kontak','cerita']];
  const navs=$$('#site-header nav a,#site-header [data-open-search],.stitch-mobile-nav a'),depth=new Set();
  // Existing image containers get subtle perspective. The layout and images are unchanged.
  const images=$$('#bagian-sudut .aspect-\\[4\\/3\\],#studio #catalog-preview');
  images.forEach(node=>node.setAttribute('data-scroll-depth',''));
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?depth.add(e.target):depth.delete(e.target));schedule();},{rootMargin:'120px'}).observe(document.getElementById('bagian-sudut'));
  }
  function update(){
    frame=0;let active='beranda';
    for(const [id,key] of points){const node=document.getElementById(id);if(node && node.getBoundingClientRect().top<160)active=key;}
    navs.forEach(a=>{const yes=a.getAttribute('href')==='#'+active;if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    const height=document.documentElement.scrollHeight-innerHeight;
    $('#reading-progress').style.transform=`scaleX(${height>0?Math.max(0,Math.min(1,scrollY/height)):0})`;
    $('#back-to-top').classList.toggle('shown',scrollY>600);
    images.forEach(node=>{
      if(L.reduced()||node.dataset.flat==='true'){node.style.removeProperty('transform');return;}
      const r=node.getBoundingClientRect();if(r.top>innerHeight+100||r.bottom<-100)return;
      const p=Math.max(-1,Math.min(1,(r.top+r.height/2-innerHeight/2)/innerHeight));
      node.style.transform=`perspective(1400px) translate3d(0,${(p*-8).toFixed(2)}px,0) rotateX(${(p*3).toFixed(2)}deg)`;
    });
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(schedule).observe($('#main'));
  $('#back-to-top').addEventListener('click',()=>{history.pushState(null,'',location.pathname+location.search+'#beranda');scrollToPart('#beranda');});
  $('.motion-toggle')?.addEventListener('click',schedule);
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',schedule);
  // Long-form stories are on this page, and each jump target is real.
  if(window.LOKA_CONFIG.contacts.address)$('#location-note').hidden=true;
  schedule();
  if(location.hash==='#akun')openAccount(false);
  else if(location.hash)requestAnimationFrame(()=>scrollToPart(location.hash));
})();
