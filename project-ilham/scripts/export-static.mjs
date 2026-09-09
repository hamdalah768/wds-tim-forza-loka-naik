import { cp, mkdir, writeFile } from 'node:fs/promises';
const dest=new URL('../lomba-statis/',import.meta.url);
await mkdir(dest,{recursive:true});
await cp(new URL('../public/',import.meta.url),dest,{recursive:true});
await writeFile(new URL('runtime.js',dest),'window.LOKA_RUNTIME=Object.freeze({mode:"static",google:false});\n');
await writeFile(new URL('_headers',dest),"/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'\n");
console.log('Ekspor statis satu halaman siap di lomba-statis. Fitur server akun hanya tersedia lewat npm start.');
