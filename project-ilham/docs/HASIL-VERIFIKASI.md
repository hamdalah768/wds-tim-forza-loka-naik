# Hasil pemeriksaan — 9 September 2026

Runtime: Node.js 24.19.0. Pemeriksaan dilakukan pada kode paket, menggunakan database sementara; tidak ada akun nyata, kredensial provider, atau data pribadi pengguna yang dimasukkan ke pengujian.

**31 pengujian otomatis lulus, 0 gagal** pada perintah `node --test --test-concurrency=1 tests/*.test.mjs`.

Cakupan: registrasi/login email, hash password, rotasi sesi, CSRF/Origin, rate limit, validasi JSON/password, progres lengkap/tidak lengkap, CRUD rancangan, isolasi antarakun, escaping HTML, ekspor akun tanpa rahasia, logout, pemulihan dan rotasi kode, pergantian password, database persisten, traversal/berkas privat, header produksi dan cookie Secure, parameter Google state/nonce/PKCE, tanda tangan dan klaim ID token, callback Facebook, ikatan sesi SMS, kode salah dan replay, sumber belajar, FAQ, aset/kelas sumber serta ekspor statis.

Uji protokol HTTP sungguhan melalui server lokal (bukan hanya listener tiruan) juga dijalankan: session 200 → register 201 → simpan kuis 200 → ekspor akun 200 → logout 200 → akses privat setelah logout 401.

Pemeriksaan struktur: satu file HTML utama, ID unik, seluruh anchor tetap mengarah ke elemen, sumber gambar/font/style/script lokal tersedia, tanpa handler JavaScript inline. Enam aset gambar sumber disalin tanpa perubahan byte dari paket yang memuat URL desain yang sama. Seluruh teks pokok dan utility CSS layar modul tetap tercakup dalam uji regresi.

Tiga rujukan eksternal dibuka saat pemeriksaan: Nikon Quickstart Food Photography, Adobe Diffused Light, dan Adobe Flat Lay. Semuanya menyediakan artikel sesuai materi pada waktu pemeriksaan. Keterjangkauan dari jaringan pengguna dan perubahan URL di masa depan tidak dapat dijamin; materi inti berada di halaman lokal.

## Yang belum terbukti

- Belum dilakukan perbandingan pixel, interaksi browser otomatis, atau uji manual pada perangkat/zoom/pembaca layar pengguna. Media query dan perilaku browser native telah disiapkan, tetapi hasil ini bukan bukti bahwa seluruh UI bebas bug.
- Tidak mempunyai sumber beranda berfoto latar yang disebut pengguna; hanya layar modul terbaru yang tersedia. Tidak mengklaim kesesuaian visual beranda tersebut.
- OAuth Google/Meta dan SMS nyata belum diselesaikan pada akun pengelola. Pengujian Facebook/SMS memakai respons provider tiruan; pengujian kriptografi Google memakai pasangan kunci sementara. Ini tidak sama dengan keberhasilan masuk pada provider produksi.
- Open License foto dari ekspor belum terverifikasi, sebagaimana dicatat di SUMBER-ASET.md.
- Belum dilakukan pentest/audit independen, pengujian kapasitas hosting publik, pemulihan backup di hosting pengguna, atau pengujian crash/operasi pada Windows milik pengguna.

Tidak ada klaim "tanpa bug sama sekali", "100% aman", atau "pasti juara". Pengujian berikutnya harus berfokus pada batas nyata di atas dan dilakukan terhadap berkas desain asli lengkap.
