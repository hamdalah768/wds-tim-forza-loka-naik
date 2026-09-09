# Sumber aset dan rujukan

## Desain yang diberikan pengguna

Arsip sumber terbaru: `stitch_project_file_builder(2).zip`. SHA-256: `cdd27a291eae95a144b90d73f54cbb211a6ab57530c2eec6fd9f3539f1d01b7e`.

Arsip berisi `code.html`, `screen.png`, dan `DESIGN.md`, yaitu satu rancangan halaman belajar. Implementasi satu halaman mempertahankan arah warna, kartu, susunan materi, dan ilustrasi produk dari rancangan tersebut. Tidak ada source code Naturia yang dimasukkan ke proyek ini.

| Berkas aset | Asal | Status |
| --- | --- | --- |
| `jar-after.webp` / `.png` | Gambar “Foto Dengan Reflektor Karton Putih” dari HTML Stitch pengguna. | Ilustrasi; lisensi terbuka tidak tercantum pada arsip. |
| `jar-before.webp` / `.png` | Gambar “Foto Tanpa Reflektor” dari HTML Stitch pengguna. | Arsip aset asal, tidak dipakai untuk klaim perbandingan nyata. |
| `mug.webp` / `.png` | Ilustrasi sudut sejajar keramik dari HTML Stitch. | Lisensi terbuka belum terverifikasi. |
| `woven.webp` / `.png` | Ilustrasi sudut 45° kerajinan anyaman dari HTML Stitch. | Lisensi terbuka belum terverifikasi. |
| `batik.webp` / `.png` | Ilustrasi flat lay batik dari HTML Stitch. | Lisensi terbuka belum terverifikasi. |
| `logo.webp` / `.png` | Aset logo dari HTML Stitch. | Logo asli tampil pada header dan footer; beberapa elemen pendukung memakai SVG lokal. |

URL asal lengkap beserta nama/ukuran unduhan tercatat dalam **`imported-assets.json`**. Gambar diunduh dari tautan Googleusercontent yang memang ada dalam HTML unggahan, lalu dikonversi ke WebP untuk tampilan lokal. Tidak ada klaim bahwa ilustrasi tersebut merupakan dokumentasi usaha nyata, karya foto peserta, atau bebas lisensi.

**Untuk lomba:** pastikan hak penggunaan dan ketentuan lisensinya memenuhi guide book. Jika belum bisa dibuktikan sebagai lisensi terbuka yang diperbolehkan, ganti dengan foto hasil peserta sendiri atau foto berlisensi terbuka yang sudah diperiksa. Ganti juga kredit yang sesuai, lalu jalankan ekspor statis. Cukup menambahkan tulisan “sumber Google” tidak membuktikan lisensi.

Komponen perbandingan memulihkan kedua gambar asli dari desain Stitch. Keduanya merupakan ilustrasi sumber, bukan dokumentasi pengukuran atau bukti eksperimen fotografi nyata.

## Foto keripik pisang

- Judul: **Banana Chips from India**.
- Pembuat: **Barthateslisa**.
- Sumber: https://commons.wikimedia.org/wiki/File:Banana_Chips_from_India.jpg
- Lisensi: **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/
- Tanggal karya yang dicantumkan sumber: 6 Juni 2015.
- File lokal: `public/assets/img/banana-original.jpg` dan `banana.webp`.
- Perubahan: ukuran diperkecil, format dikonversi ke WebP, dan tampilan dipotong secara visual sesuai bingkai kartu. Turunan foto tetap dilisensikan CC BY-SA 4.0. Foto tidak menyatakan produk berasal dari usaha LokaNaik atau usaha tertentu di Indonesia.
- Kredit terdapat di halaman Cerita → Sumber, dokumen ini, dan hasil ekspor kartu Studio jika foto keripik digunakan.

## Font dan ikon

**Plus Jakarta Sans**, Tokotype. Sumber distribusi: Google Fonts, https://fonts.google.com/specimen/Plus+Jakarta+Sans. Lisensi **SIL Open Font License 1.1** tersedia pada `public/assets/fonts/OFL.txt`; sumber lisensi: https://github.com/google/fonts/tree/main/ofl/plusjakartasans. Lima bobot lokal digunakan agar halaman tidak meminta font ke CDN saat dibuka.

Ikon desain asli memakai font lokal Material Symbols Outlined. Ikon formulir pendukung memakai SVG lokal. Simbol Google hanya dipakai untuk mengenali metode login Google dan tidak menyatakan afiliasi atau dukungan dari Google. Merek penyedia tetap milik pemiliknya.

## Runtime backend

Node.js 24 memakai modul bawaan HTTP, crypto, dan SQLite. Tidak ada dependensi npm tambahan di paket perbaikan ini.

## Rujukan materi

Materi editorial disusun sebagai latihan dasar. Rujukan dibuka pada tab baru dan tidak ditampilkan seolah bagian milik LokaNaik:

- Cahaya jendela dan reflektor: https://www.nikon.co.uk/en_GB/learn-and-explore/magazine/nikon-quickstart/take-better-food-photographs-with-your-nikon-quickstart-cheat-sheet
- Difusi: https://www.adobe.com/creativecloud/photography/technique/diffused-light.html
- Flat lay: https://www.adobe.com/creativecloud/photography/type/flat-lay-photography.html

Rujukan keamanan implementasi ada di `KEAMANAN.md`. Materi tidak memuat survei, statistik keberhasilan, testimoni, atau sertifikasi yang dibuat-buat.


## Pemulihan desain September 2026

Halaman modul memakai file PNG asli `logo.png`, `jar-before.png`, `jar-after.png`, `mug.png`, `woven.png`, dan `batik.png` dari URL dalam `imported-assets.json`. Kedua gambar reflektor sumber dipertahankan; ilustrasi tidak diklaim sebagai eksperimen foto nyata.

Material Symbols Outlined disimpan lokal di `public/assets/fonts/symbols-0.ttf`. Sumber resmi: https://github.com/google/material-design-icons dan https://fonts.google.com/icons. Lisensi Apache 2.0 disertakan sebagai `public/assets/fonts/MATERIAL-SYMBOLS-LICENSE.txt`. Font Plus Jakarta Sans versi italic disimpan sebagai `italic-*.ttf`, lisensi OFL sama dengan varian normal.

Rujukan materi terbaru ada di `RUJUKAN-BELAJAR.md`.
