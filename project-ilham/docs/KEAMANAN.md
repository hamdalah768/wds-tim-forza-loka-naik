# Penyimpanan dan keamanan aplikasi

## Kontrol yang diterapkan

- Password: scrypt N=131072, r=8, p=1, salt acak per password, minimal 15 dan maksimal 128 karakter. Perbandingan hash memakai timing-safe comparison, dengan pekerjaan hash dummy untuk akun yang tidak ditemukan. Maksimum dua pekerjaan hash bersamaan membatasi penggunaan memori.
- Cookie sesi HttpOnly, SameSite=Lax; nama `__Host-` dan atribut Secure pada produksi. Token sesi 32 byte acak; database menyimpan SHA-256 token. Sesi idle 30 menit, batas absolut 12 jam. Rotasi saat login, register, dan pemulihan.
- CSRF: token terikat sesi, pemeriksaan Origin yang persis cocok, pemeriksaan Sec-Fetch-Site pada mutasi, dan validasi Host.
- SQL prepared statements, foreign keys, transaksi, dan pembatasan user_id dari sesi. ID pengguna dari request tidak dipercaya untuk mengakses data.
- Body JSON maksimal 16 KiB, tipe dan panjang data divalidasi, kategori/gambar dibatasi daftar yang diizinkan. Studio tidak menerima SVG/HTML atau file upload arbitrer.
- Rate limit API, login, registrasi, recovery, OAuth, serta SMS. Counter disimpan di database. X-Forwarded-For tidak dipercaya; klien tidak bisa mengganti IP melalui header tersebut. Di balik reverse proxy, batas IP berlaku ke koneksi proxy; gunakan pembatasan tambahan di proxy untuk beban nyata.
- Pemulihan memakai kode acak yang ditampilkan satu kali, hash di server, konsumsi dengan conditional update untuk mencegah dua request memakai kode sama. Pemulihan dan perubahan password mencabut sesi lama.
- CSP membatasi script/font/style/koneksi ke server sendiri; tanpa unsafe-inline atau unsafe-eval. Frame ditolak; nosniff, Referrer-Policy, Permissions-Policy, dan HSTS produksi diterapkan.
- `.env`, database, folder server, dan reference tidak dapat dibaca melalui static server. Aset disajikan hanya dari daftar direktori/ekstensi yang diizinkan.
- Ekspor akun tidak menyertakan password hash, recovery hash, token sesi, CSRF, client secret, atau token penyedia. Progres, hasil kuis, profil publik akun, serta rancangan milik pengguna dapat diunduh.
- Setelah pergantian akun, tampilan progres dan rancangan dipulihkan dari akun baru. Antrian simpan lama tidak boleh memakai sesi pemilik yang berbeda.

## Menjalankan di server publik

Gunakan HTTPS, `NODE_ENV=production`, serta `APP_ORIGIN` yang sesuai domain. Simpan database pada volume persisten privat di luar `public`; jalankan proses dengan pengguna sistem khusus. Folder data dibuat dengan mode 0700 dan file utama 0600 pada sistem yang mendukung. Perlindungan ACL Windows mengikuti konfigurasi komputer.

Aktifkan enkripsi disk/volume dan cadangan terenkripsi di lingkungan hosting. SQLite pada paket ini **tidak mengenkripsi seluruh data secara otomatis**. Nama, email, nomor HP, progres, dan rancangan dapat dibaca oleh administrator yang mempunyai akses database. Hash password bukan pengganti enkripsi database atau kontrol akses server.

Buat backup konsisten menggunakan API backup SQLite atau hentikan proses sebelum menyalin data. Saat memakai WAL, jangan menyalin file utama yang sedang aktif tanpa mekanisme backup SQLite. Pulihkan cadangan pada direktori terpisah dan periksa akses akun sebelum mengganti data aktif.

Tidak ada publikasi server, pengiriman SMS, atau penggunaan akun pihak ketiga yang dilakukan dari paket ini. Tidak ada kunci bawaan. Google/FB/HP gagal tertutup ketika belum terkonfigurasi. Penambahan penyedia baru memerlukan peninjauan terpisah.

Email lokal belum diverifikasi melalui pengiriman email; tidak boleh diperlakukan sebagai bukti kepemilikan alamat. Reset lewat email belum tersedia. Gunakan kode pemulihan atau metode provider yang dipakai saat mendaftar. Aplikasi belum menyediakan MFA akun email atau sesi perangkat dengan identitas perangkat rinci. Endpoint mencabut sesi lain tersedia; tidak ada klaim MFA/keamanan mutlak.

## Rujukan teknis

- OWASP Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Node.js Crypto: https://nodejs.org/api/crypto.html
- Node.js SQLite: https://nodejs.org/api/sqlite.html

Pengujian internal tidak sama dengan pentest, audit independen, atau jaminan bebas bug. Daftar hasil dan keterbatasan ada di HASIL-VERIFIKASI.md.
