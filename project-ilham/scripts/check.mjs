import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),errors=[];
let count=0;
async function walk(p){let r=[];for(const item of await readdir(p,{withFileTypes:true})){const file=resolve(p,item.name);if(item.isDirectory())r.push(...await walk(file));else r.push(file);}return r;}
for(const dir of ['public/assets/js','server','scripts','tests']) for(const p of await walk(resolve(root,dir))){
  if(!/\.m?js$/.test(p))continue;
  const run=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(run.status)errors.push(run.stderr);count++;
}
const text=await readFile(resolve(root,'public/index.html'),'utf8');
const ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(new Set(ids).size!==ids.length)errors.push('ID HTML duplikat.');
if(/href=["']#["']/.test(text))errors.push('Tautan kosong.');
if(/\son(?:click|submit|load|error)\s*=/.test(text))errors.push('Event inline.');
for(const m of text.matchAll(/(?:src|href)="([^"]+)"/g)){
  const path=m[1];if(/^(?:https?:|tel:|mailto:|data:)/.test(path))continue;
  if(path.startsWith('#')){if(!ids.includes(path.slice(1))&&path!=='#akun'&&!path.startsWith('#cerita-detail-'))errors.push('Anchor hilang: '+path);continue;}
  try{await stat(resolve(root,'public',path.split(/[?#]/)[0]));}catch{errors.push('Aset hilang: '+path);}
}
const pages=(await readdir(resolve(root,'public'))).filter(x=>x.endsWith('.html'));
if(pages.length!==1)errors.push('Harus satu dokumen HTML utama.');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Lulus: ${count} file JavaScript; satu HTML; ID, anchor dan aset lokal lengkap.`);
