# Project Ilham — LokaNaik

Paket perbaikan satu halaman untuk belajar foto produk dan menyusun katalog UMKM. HTML, CSS, dan JavaScript dipisahkan; akun dijalankan oleh server Node.js dan SQLite. Tidak ada paket npm tambahan yang harus diunduh.

## Jalankan di VS Code

1. Ekstrak ZIP terlebih dahulu. Buka folder `project-ilham` melalui **File → Open Folder**.
2. Pasang **Node.js versi 24**. Versi pengujian proyek: 24.19.0. Minimum yang ditargetkan: 24.13.0.
3. Buka **Terminal → New Terminal**, lalu jalankan `npm start`.
4. Buka **http://localhost:3000**. Terminal harus tetap menyala selama aplikasi digunakan.
5. Tekan **Masuk → Buat akun** untuk mendaftar. Simpan kode pemulihan yang ditampilkan sekali.

Di Windows, `MULAI-WINDOWS.cmd` melakukan pemeriksaan Node dan menjalankan server yang sama. Alternatif tanpa npm:

```sh
node --env-file-if-exists=.env server/index.mjs
```

`npm install` dan ekstensi Live Server tidak diperlukan. Membuka `index.html` langsung hanya memberikan tampilan statis; login nyata harus dijalankan melalui alamat server di atas. Jangan memakai `about:blank` sebagai alamat website.

## Desain yang bisa dipastikan

Acuan terbaru yang tersedia, `stitch_project_file_builder(2).zip`, berisi tepat satu desain: **01. Memanfaatkan Cahaya Alami Jendela**. File sumber, screenshot, dan token disertakan dalam `design-source`.

Layout modul, teks pokok, warna emerald/mint, font, bentuk kartu, dan enam aset asli dipertahankan. Foto pembanding tidak diganti dengan gambar baru atau filter. Aset lokal diambil dari paket proyek sebelumnya yang menyertakan URL sumber yang sama. Ada tambahan kuis di akhir materi, perbaikan responsif, dan kontrol navigasi.

**Halaman beranda lain dengan foto latar penuh tidak terdapat di arsip tersebut maupun paket perbaikan sebelumnya.** Karena itu, paket ini membuka modul sumber yang tersedia. Paket ini belum dapat disebut identik dengan beranda berfoto yang Anda maksud. Untuk memulihkannya persis, diperlukan HTML/CSS/aset atau ekspor lengkap halaman beranda itu. Foto baru tidak dibuat untuk menggantikannya.

Bagian Belajar, Pencarian, Studio, Cerita, dan Akun memakai komponen dari paket sebelumnya dan disambungkan dalam satu dokumen. Bagian tersebut bukan tujuh layar desain asli yang diberikan terpisah.

## Perilaku yang diperbaiki

| Bagian | Perilaku |
| --- | --- |
| Navigasi | Anchor nyata, indikator bagian aktif, dock pada ponsel/tablet, tautan lama dialihkan ke anchor baru. |
| Pencarian | Pencarian lokal langsung, kategori, urutan durasi, keadaan kosong, reset, Ctrl/Cmd+K, pencarian tujuan Studio dan kontak. |
| Belajar | Tiga bagian lengkap tetap terbaca tanpa akun; kartu membuka materi yang benar; tiga kuis memiliki jawaban dan penjelasan. |
| Perbandingan | Range mulai 50%; kedua foto punya ukuran wadah sama; dapat digeser dengan pointer dan tombol panah. |
| Progres | Checklist harus dikerjakan sebelum ditandai selesai; progres akun tersimpan di SQLite. |
| Studio | Pratinjau langsung, simpan/buka/ubah/hapus rancangan, unduh PNG dan teks. Pilihan foto memakai aset yang tersedia. |
| Login | Dialog muncul dari tombol Masuk/Akun; daftar dan masuk email nyata; pemulihan satu kali; perubahan profil/password; ekspor data. |
| Akun lain | Progres dan rancangan dibersihkan dari tampilan ketika akun berubah; permintaan server dibatasi ke pemilik sesi. |
| Motion | Scroll native yang halus, perspektif CSS ringan pada kartu, penghormatan pengaturan reduced motion, tombol kurangi animasi. |
| Informasi | FAQ, sumber, privasi, kemudian kontak/lokasi pada akhir halaman sebelum footer. |

Gambar/font lokal tidak memerlukan koneksi eksternal. Tautan artikel dan penyedia login memerlukan internet. Alamat kunjungan belum diberikan: isi alamat asli pada `public/assets/js/config.js` agar peta ditampilkan. Kontak sosial mengikuti sumber yang diberikan; Facebook masih membuka pencarian nama karena URL profil pasti belum diberikan. Jangan menganggap kontak tersebut telah diverifikasi kepemilikannya.

## Akun dan data

- Email/password bisa dipakai langsung setelah server hidup. Ini bukan akun demo. Email lokal belum diverifikasi melalui email; status ini ditampilkan dengan jujur.
- Google, Facebook, dan SMS perlu pengaturan milik pengelola. Lihat `docs/LOGIN.md`. Tombol yang belum tersedia tetap terlihat redup, dengan penjelasan; tidak membuat akun palsu.
- Apple belum diimplementasikan dalam paket ini.
- Database berada di `data/lokanaik.sqlite`; direktori dibuat saat pertama berjalan. Jangan menghapusnya ketika memperbarui kode.
- Profil, progres, kuis, dan rancangan terikat ke pengguna yang masuk. Kata sandi memakai scrypt; token sesi disimpan sebagai hash dan dibawa lewat cookie HttpOnly, bukan localStorage.
- Checklist tamu dan preferensi animasi hanya memakai penyimpanan perangkat, tanpa kata sandi atau token login.
- Kode pemulihan hanya ditampilkan setelah pendaftaran/pemulihan/pergantian password. Jika tidak mempunyai kode, gunakan akun penyedia yang memang terhubung; tidak ada pintu belakang untuk memulihkan akun.

## Susunan berkas

| Lokasi | Isi |
| --- | --- |
| `public/index.html` | Satu halaman utama serta dialog akun. |
| `public/assets/css/` | CSS sumber, CSS komponen pendukung yang dibatasi cakupannya, dan perbaikan interaksi. |
| `public/assets/js/` | Navigasi, pencarian, akun, latihan, kuis, dan Studio. |
| `public/assets/img/`, `fonts/` | Aset lokal dan lisensi font. |
| `server/` | HTTP, SQLite, autentikasi, validasi, sesi, OAuth dan SMS. |
| `tests/` | Pengujian regresi alur data dan keamanan. |
| `lomba-statis/` | Salinan website statis tanpa backend akun. |
| `design-source/` | Desain terbaru yang tersedia sebagai pembanding. |
| `docs/` | Pengaturan login, keamanan, sumber, batas lomba, hasil pengujian. |

## Memeriksa perubahan

```sh
node scripts/check.mjs
node --test --test-concurrency=1 tests/*.test.mjs
node scripts/export-static.mjs
node server/static.mjs
```

Perintah terakhir membuka versi statis di http://localhost:4173. Setelah mengubah `public`, buat ulang ekspor statis. Jangan menyalin folder server atau database ke layanan hosting statis.

## Jika tidak berjalan

- **Node tidak dikenali:** pasang Node.js 24, lalu tutup dan buka kembali VS Code.
- **Port digunakan:** hentikan server lama dengan Ctrl+C, atau ubah `PORT` dan `APP_ORIGIN` bersama di `.env`.
- **Sesi keamanan tidak valid:** gunakan alamat yang sama persis dengan `APP_ORIGIN`. Jangan mencampur `localhost` dan `127.0.0.1`.
- **Server terputus:** hidupkan kembali terminal/server. Pencarian dan bacaan tetap tersedia; perubahan akun membutuhkan server aktif.
- **Google tidak lanjut:** pastikan client ID, client secret, redirect URI, status aplikasi, dan akun penguji sudah benar pada layanan Google.
- **Nomor HP tidak mendapat SMS:** metode ini memerlukan Twilio Verify yang aktif, tujuan yang diizinkan, dan batas pengiriman yang belum terlampaui.

Untuk lomba, baca `docs/PANDUAN-LOMBA.md`. Versi dengan server tidak sama dengan persyaratan website statis. Tidak ada klaim pasti juara, bebas seluruh bug, audit keamanan independen, atau seluruh aset telah memenuhi Open License.
