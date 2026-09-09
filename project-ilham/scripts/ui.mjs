export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  book: '<path d="M12 6v15M3 4c3-1 6-1 9 2 3-3 6-3 9-2v15c-3-1-6-1-9 2-3-3-6-3-9-2z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  camera:
    '<path d="M3 6h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="12.5" r="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  pen: '<path d="m14 4 6 6M4 20l2-7L17 2l5 5-11 11zM4 20l7-2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield:
    '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z"/><path d="m8 12 3 3 5-6"/>',
  chat: '<path d="M21 11a9 9 0 0 1-13 8l-6 3 2-6A9 9 0 1 1 21 11Z"/><path d="M8 10h8m-8 4h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  play: '<path d="m9 5 11 7-11 7z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  phone:
    '<path d="M5 3H2c-1 12 8 21 20 20v-4l-6-3-3 3-8-8 3-3z" transform="translate(1 -1) scale(.9)"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  download: '<path d="M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  leaf: '<path d="M20 3C7 1 2 7 5 15s15 5 15-12Z"/><path d="M3 22 15 10"/>',
  star: '<path d="m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V3H3v13h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
export const button = (text, href, cls = "primary", glyph = "arrow") =>
  `<a class="button ${cls}" href="${escape(href)}">${text}${icon(glyph)}</a>`;
export const image = (file, alt, cls = "", eager = false) =>
  `<img class="${cls}" src="assets/img/${escape(file)}" alt="${escape(alt)}" width="720" height="600" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>`;
export const pill = (text) => `<span class="pill">${text}</span>`;
export const lessonCard = (
  l,
  i = 0,
) => `<article class="lesson-card reveal" data-category="${escape(l.category)}">
  <a class="card-image" href="materi.html?topik=${escape(l.slug)}#${escape(l.anchor || 'bagian-posisi')}" tabindex="-1" aria-hidden="true">${image(l.image, "")}${pill(l.category)}<span class="round-link">${icon("diagonal")}</span></a>
  <div class="card-body"><div class="meta"><span>${String(i + 1).padStart(2, "0")} / ${escape(l.level)}</span><span>${icon("clock")}${l.time} menit</span></div><h3><a href="materi.html?topik=${escape(l.slug)}#${escape(l.anchor || 'bagian-posisi')}">${escape(l.title)}</a></h3><p>${escape(l.summary)}</p><div class="card-bottom"><span>Modul Foto Produk</span><a class="text-link" href="materi.html?topik=${escape(l.slug)}#${escape(l.anchor || 'bagian-posisi')}">Mulai belajar ${icon("arrow")}</a></div></div>
</article>`;
export const brand = () =>
  `<a class="brand" href="index.html" aria-label="LokaNaik — beranda"><span class="brand-mark">${icon("leaf")}</span><span>Loka<span class="brand-light">Naik</span><span class="brand-dot">.</span></span></a>`;
export function layout(page, title, description, body) {
  const nav = [
    ["index", "Beranda"],
    ["belajar", "Belajar"],
    ["studio", "Studio"],
    ["cerita", "Cerita"],
  ];
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#005b45"><meta name="description" content="${escape(description)}"><title>${escape(title)} — LokaNaik</title><link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg"><link rel="stylesheet" href="assets/css/fonts.css"><link rel="stylesheet" href="assets/css/site.css"><script src="runtime.js" defer></script><script src="assets/js/config.js" defer></script><script src="assets/js/content.js" defer></script><script src="assets/js/search-core.js" defer></script><script src="assets/js/app.js" defer></script>${["materi", "studio", "pencarian", "akun"].includes(page) ? `<script src="assets/js/${page}.js" defer></script>` : ""}</head>
<body data-page="${page}"><a class="skip-link" href="#main">Langsung ke isi</a>
<header class="site-header"><div class="nav-wrap">${brand()}<nav class="primary-nav" aria-label="Navigasi utama" id="primary-nav">${nav.map(([id, label]) => `<a href="${id}.html"${id === page || (id === "belajar" && page === "materi") ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="nav-actions"><form class="nav-search" action="pencarian.html" role="search"><label class="sr-only" for="nav-query">Cari materi</label>${icon("search")}<input id="nav-query" type="search" name="q" placeholder="Mau belajar apa?" maxlength="100"><button aria-label="Cari">${icon("arrow")}</button></form><a href="pencarian.html" class="icon-button mobile-search" aria-label="Buka pencarian">${icon("search")}</a><a class="button small primary account-nav" href="akun.html">Masuk${icon("diagonal")}</a><button class="icon-button menu-toggle" aria-label="Buka navigasi" aria-controls="primary-nav" aria-expanded="false">${icon("menu")}</button></div></div><progress class="scroll-progress" max="100" value="0" aria-label="Progres membaca halaman"></progress></header>
<main id="main" tabindex="-1">${body}</main>
<footer class="site-footer"><div class="container"><div class="footer-top"><div>${brand()}<p>Langkah kecil hari ini,<br>peluang lebih besar esok hari.</p><span class="footer-label">Ruang belajar untuk usaha lokal Indonesia.</span></div><div class="footer-links"><strong>Mulai melangkah</strong><a href="belajar.html">Jelajahi materi</a><a href="studio.html">Studio latihan</a><a href="pencarian.html">Pencarian</a></div><div class="footer-links"><strong>Tentang LokaNaik</strong><a href="cerita.html">Cerita & tujuan</a><a href="cerita.html#faq">Pertanyaan umum</a><a href="cerita.html#kontak">Hubungi kami</a><a href="cerita.html#sumber">Sumber & atribusi</a></div><div class="footer-note">${icon("sun")}<strong>Pelan juga tetap<br>berjalan.</strong><a href="materi.html?topik=cahaya-jendela">Mulai dari satu materi ${icon("arrow")}</a></div></div><div class="footer-bottom"><span>© 2026 LokaNaik · Belajar, praktik, bertumbuh.</span><div><button class="text-button" data-dialog="privacy">Privasi</button><button class="text-button" data-dialog="terms">Ketentuan</button><button class="text-button motion-toggle" aria-pressed="false">Kurangi animasi</button></div></div></div></footer>
<nav class="mobile-dock" aria-label="Navigasi cepat">${[
    ["index", "Beranda", "home"],
    ["belajar", "Belajar", "book"],
    ["studio", "Studio", "grid"],
    ["akun", "Akun", "user"],
  ]
    .map(
      ([id, label, glyph]) =>
        `<a href="${id}.html"${id === page || (id === "belajar" && page === "materi") ? ' aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></a>`,
    )
    .join(
      "",
    )}</nav><button class="to-top icon-button" aria-label="Kembali ke atas">${icon("arrow")}</button>
<div class="toast-region" aria-live="polite" aria-atomic="true"></div><dialog id="info-dialog" class="info-dialog" aria-labelledby="dialog-title"><form method="dialog"><button class="icon-button close-dialog" aria-label="Tutup">${icon("close")}</button></form><h2 id="dialog-title"></h2><div id="dialog-body"></div></dialog><noscript><div class="no-script">Navigasi dan FAQ dapat digunakan. Aktifkan JavaScript untuk pencarian, latihan interaktif, dan akun.</div></noscript></body></html>`;
}
