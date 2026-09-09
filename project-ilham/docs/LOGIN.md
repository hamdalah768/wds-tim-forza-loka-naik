# Pengaturan login

Akun email dapat digunakan tanpa kredensial layanan pihak ketiga. Google, Facebook, dan nomor HP merupakan integrasi opsional yang memerlukan akun pengelola layanan masing-masing. Jangan memasukkan kata sandi akun Google/Facebook ke konfigurasi.

Salin `.env.example` menjadi `.env`, isi nilai yang diperlukan, lalu mulai ulang server. Simpan `.env` hanya di server. Nilai publik browser tidak berisi client secret, SMS token, password, atau token provider. File contoh berisi nilai kosong; paket tidak berisi akun demo.

## Google

1. Buat konfigurasi OAuth untuk aplikasi web pada proyek Google Anda; atur layar persetujuan serta akun penguji bila aplikasi masih dalam pengujian.
2. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` bersama.
3. Daftarkan URI callback **persis** `http://localhost:3000/api/auth/google/callback` untuk alamat lokal bawaan. Untuk domain HTTPS Anda, gunakan `https://domain-anda/api/auth/google/callback` dan ubah `APP_ORIGIN`.
4. Mulai ulang server, tekan Masuk, lalu pilih Google. Halaman persetujuan berasal dari Google.

Alur memakai authorization code, state terikat sesi, PKCE S256 dan nonce. ID token diperiksa tanda tangan RS256, issuer, audience, authorized party, waktu berlaku, email_verified, sub, serta nonce. Kunci diperoleh hanya dari endpoint JWKS Google yang tetap. Token akses/refresh/ID tidak disimpan atau dikirim ke frontend. Identitas disimpan lewat subject Google.

Jika email telah terdaftar dengan metode lain, aplikasi meminta memakai metode lama. Tidak ada penggabungan berdasarkan kecocokan email yang belum diverifikasi.

Dokumentasi: https://developers.google.com/identity/openid-connect/openid-connect

## Facebook

1. Buat aplikasi Facebook Login milik Anda. Lengkapi konfigurasi serta akses akun penguji/izin yang diminta oleh Meta.
2. Isi `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, dan `FACEBOOK_GRAPH_VERSION` menggunakan versi yang berlaku pada dasbor aplikasi, berbentuk `vNN.N`.
3. Daftarkan callback `http://localhost:3000/api/auth/facebook/callback`, atau callback HTTPS berdasarkan `APP_ORIGIN`. Persyaratan domain/HTTPS dan mode aplikasi mengikuti pengaturan Meta Anda.
4. Mulai ulang, lalu uji masuk, pembatalan, dan keluar pada akun penguji sebelum tersedia untuk umum.

State satu kali terikat ke sesi. Server memeriksa access token dengan debug_token, app_id, user_id, kedaluwarsa, serta data akses; pembacaan profil memakai appsecret_proof. Tidak menyimpan access token atau kata sandi Facebook. Email yang tidak diberikan provider boleh kosong, bukan email palsu. Tidak menggabungkan akun diam-diam.

Dokumentasi: https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow

## Nomor HP melalui SMS

1. Aktifkan Twilio Verify Service untuk SMS.
2. Isi `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, dan `TWILIO_VERIFY_SERVICE_SID`.
3. Atur negara tujuan, pembatasan akun, saldo, dan perlindungan pengiriman pada layanan tersebut.
4. Mulai ulang aplikasi. Nomor `08…` dinormalisasi ke `+628…`; nomor internasional harus berformat E.164.
5. Kode diverifikasi oleh Twilio. Aplikasi tidak menghasilkan kode demo, tidak menampilkannya di UI/log, dan tidak menyimpannya sebagai OTP plaintext.

Pengiriman dibatasi per IP dan nomor. Verifikasi terikat ke sesi peminta; kode tidak dapat dipakai dari sesi lain. Pengiriman SMS dapat menimbulkan biaya provider. Tidak ada SMS yang dikirim selama pengujian paket ini; pengujian otomatis memakai respons tiruan penyedia.

Dokumentasi: https://www.twilio.com/docs/verify/api/verification
https://www.twilio.com/docs/verify/api/verification-check

## Batas pengujian

Alur lokal dan validasi token diuji otomatis. Penyelesaian OAuth pada akun Google/Meta nyata dan pengiriman SMS nyata belum diuji karena kredensial pengelola belum tersedia. Apple belum tersedia. Jangan menjanjikan metode masuk yang belum diaktifkan kepada pengguna.
