import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {content} from '../server/content.mjs';
const file=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('desain asli tetap memiliki tujuh penempatan gambar, semua bagian dan teks utama',async()=>{
 const original=await file('design-source/code.html');
 const current=await file('public/index.html');
 assert.equal([...original.matchAll(/<img\b/g)].length,7);
 assert.ok([...current.matchAll(/<img\b/g)].length>=7);
 const ids=[...original.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).filter(x=>x!=='tailwind-config');
 for(const id of ids)assert.ok(current.includes(`id="${id}"`),id);
 for(const text of ['Mengatur Posisi Produk Terhadap Jendela','Perbandingan: Keajaiban Reflektor Kertas Manila','3 Sudut Pengambilan Gambar untuk Katalog','Alat Pendukung Sederhana','Mata Sejajar Produk','Perspektif Pembeli','Bidikan Dari Atas','Kembali ke Ruang Belajar','Aksesibilitas &amp; Kemitraan'])assert.ok(current.includes(text),text);
 const assets=JSON.parse(await file('docs/imported-assets.json'));
 for(const asset of assets)assert.ok(current.includes(`assets/img/${asset.file}`));
 assert.ok(current.includes('id="compare-range-input"'));
 assert.doesNotMatch(current, /assets\/css\/site.css|assets\/js\/materi.js|cdn.tailwindcss/);
});
test('semua kelas asli memiliki CSS lokal dan ukuran sumber dipertahankan',async()=>{
 const original=await file('design-source/code.html'),css=await file('public/assets/css/original.css');
 const classes=new Set([...original.matchAll(/class="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/)));
 for(const name of classes){
   if(['group','material-symbols-outlined'].includes(name))continue;
   const escaped=name.replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c);
   assert.ok(css.includes('.'+escaped+'{')||css.includes('.'+escaped+':')||css.includes('.'+escaped+' >'),name);
 }
 assert.ok(css.includes('max-width:1240px'));assert.ok(css.includes('background-color:#e6fff5'));
 assert.ok(css.includes('border-radius:3rem'));assert.ok(css.includes('font-size:48px'));
});
test('tautan belajar dan sumber sesuai tiga bagian modul serta semua FAQ terjawab',async()=>{
 const belajar=await file('public/index.html'),materi=await file('public/index.html'),cerita=await file('public/index.html');
 for(const l of content.lessons){
   assert.ok(belajar.includes(`#${l.anchor}`));
   assert.ok(materi.includes(`id="${l.anchor}"`));
   for(const r of l.resources)assert.ok(belajar.includes(r.url));
 }
 assert.equal(content.lessons.length,3);assert.equal(content.faqs.length,11);
 for(const [question,answer] of content.faqs){assert.ok(question.length>15);assert.ok(answer.length>50);assert.ok(cerita.includes(question));}
 assert.equal((cerita.match(/<details class="faq"/g)||[]).length,11);
});
