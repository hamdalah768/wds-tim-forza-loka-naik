/* Interactions for the original Stitch screen; no layout replacement. */
(() => {
  'use strict';
  const L=window.Loka;
  if(!L)return;
  const {$,$$}=L;
  const current=document.body.dataset.page;
  const contacts=window.LOKA_CONFIG.contacts;
  $$('[data-social]').forEach(link=>{
    const key=link.dataset.social;
    if(key==='whatsapp'){
      const phone=String(contacts.phone||'').replace(/[^0-9+]/g,'');
      if(/^\+?[1-9]\d{7,14}$/.test(phone))link.href='https://wa.me/'+phone.replace('+','');
      else link.hidden=true;
      return;
    }
    const allowed={instagram:['instagram.com','www.instagram.com'],facebook:['facebook.com','www.facebook.com'],x:['x.com','www.x.com']};
    try{
      const u=new URL(contacts[key]);
      if(u.protocol==='https:'&&allowed[key].includes(u.hostname))link.href=u.href;
      else link.hidden=true;
    }catch{link.hidden=true;}
  });
  if(!$('#checklist-form'))return;
  const range=$('#compare-range-input'),overlay=$('#compare-overlay'),bar=$('#compare-slider-bar');
  function compare(){
    const value=Math.min(100,Math.max(0,Number(range.value)||0));
    // Both images remain the full size of their container; clipping avoids stretching.
    overlay.style.clipPath=`inset(0 ${100-value}% 0 0)`;
    bar.style.left=value+'%';
    range.setAttribute('aria-valuetext',`${value} persen foto dengan reflektor`);
  }
  range.addEventListener('input',compare);compare();
  const topic=new URLSearchParams(location.search).get('topik');
  const lesson=L.data.lessons.find(x=>x.slug===topic);
  if(lesson&&!location.hash)document.getElementById(lesson.anchor)?.scrollIntoView({behavior:L.reduced()?'instant':'smooth',block:'start'});
  if(topic&&!lesson)L.toast('Topik tidak ditemukan. Modul Foto Produk lengkap tetap dapat dibaca.');
  const fields=[$('#task-1'),$('#task-2'),$('#task-3')];
  const counter=$('#checklist-counter'),button=$('#btn-complete'),label=$('#btn-complete-text'),notice=$('#completion-toast'),storageStatus=$('#storage-status');
  let complete=false,key='lokanaik-photo-guest-v2',ready=false,queue=Promise.resolve(),revision=0;
  function localRead(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function snapshot(){return {lesson:'cahaya-jendela',tasks:fields.map(x=>x.checked),completed:complete};}
  function localSave(){try{localStorage.setItem(key,JSON.stringify(snapshot()));return true;}catch{return false;}}
  function show(message){notice.textContent=message;notice.classList.remove('hidden');}
  function render(){
    const count=fields.filter(x=>x.checked).length;
    counter.textContent=`${count} / 3`;
    counter.classList.toggle('bg-secondary-fixed',count===3);
    label.textContent=complete?'Materi Sudah Selesai':'Tandai Selesai';
  }
  function restore(saved){
    if(!saved||!Array.isArray(saved.tasks)||saved.tasks.length!==3)return;
    saved.tasks.forEach((v,i)=>fields[i].checked=v===true);
    complete=saved.completed===true&&fields.every(x=>x.checked);
  }
  function persist(){
    const state=snapshot(),owner=L.session.user?.id;
    if(!L.fullstack||!L.session.user){
      storageStatus.textContent=localSave()?'Perubahan checklist langsung tersimpan di peramban ini.':'Penyimpanan peramban dibatasi. Checklist tersedia selama halaman ini terbuka.';
      return Promise.resolve(false);
    }
    // Serialize writes, so an earlier checkbox change cannot overwrite completion.
    const result=queue.catch(()=>{}).then(()=>{if(owner!==L.session.user?.id)throw new Error('Akun berubah. Silakan simpan kembali.');return L.request('/api/progress',{method:'PUT',body:state});});
    queue=result;
    return result.then(()=>{storageStatus.textContent='Progres tersimpan aman di akun Anda.';return true;});
  }
  fields.forEach(input=>input.addEventListener('change',()=>{
    revision++;complete=false;notice.classList.add('hidden');render();
    if(ready)persist().catch(e=>{storageStatus.textContent='Belum tersimpan ke akun. Coba kembali.';L.toast(e.message);});
  }));
  $('#checklist-form').addEventListener('submit',e=>e.preventDefault());
  button.addEventListener('click',async()=>{
    if(!ready){show('Sedang membuka progres. Silakan tunggu sebentar.');return;}
    if(!fields.every(x=>x.checked)){show('Selesaikan dan centang ketiga langkah latihan terlebih dahulu.');return;}
    button.disabled=true;fields.forEach(x=>x.disabled=true);button.setAttribute('aria-busy','true');complete=true;render();
    try{
      const server=await persist();
      show(server?'Hebat! Modul ini tercatat tuntas di profil belajar Anda.':'Latihan selesai pada perangkat ini. Masuk untuk menyimpan progres di akun.');
    }catch(e){complete=false;render();show('Progres belum tersimpan. '+e.message);}
    finally{button.disabled=false;fields.forEach(x=>x.disabled=false);button.setAttribute('aria-busy','false');}
  });
  async function loadProgress(){
    const owner=L.session.user?.id, before=++revision;
    ready=false; button.disabled=true;complete=false; fields.forEach(x=>{x.checked=false;x.disabled=true;});notice.classList.add('hidden');render();
    if(L.fullstack && owner){
      try{
        const response=await L.request('/api/progress');
        if(revision===before && owner===L.session.user?.id) restore(response.progress.find(x=>x.lesson==='cahaya-jendela'));
        storageStatus.textContent='Perubahan checklist disimpan ke akun Anda.';
      }catch(e){L.toast(e.message);storageStatus.textContent='Progres belum termuat. Muat ulang sebelum mengubah latihan.';return;}
    }else{restore(localRead());storageStatus.textContent='Perubahan checklist tersimpan pada perangkat ini.';}
    if(revision!==before)return;
    ready=true;button.disabled=false;fields.forEach(x=>x.disabled=false);render();
    if(complete)show(owner?'Modul ini tercatat tuntas di profil belajar Anda.':'Latihan selesai pada perangkat ini.');
  }
  L.sessionReady.then(loadProgress);
  document.addEventListener('loka:sessionchange',()=>{queue=Promise.resolve();loadProgress();});
})();
