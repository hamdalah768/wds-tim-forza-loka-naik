/* Shared UI and API client. Session tokens and passwords are never put in browser storage. */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s),
    $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const runtime = window.LOKA_RUNTIME || { mode: "static", google: false };
  const data = window.LOKA_CONTENT;
  const fullstack = runtime.mode === "fullstack";
  let session = { user: null, csrf: null, google: false },
    sessionError = null,
    toastTimer;
  const arrow =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    $(".toast-region")?.replaceChildren(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.remove(), 6000);
  }
  function feedback(node, message, error = false) {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", error);
    node.classList.toggle("success", !!message && !error);
  }
  async function request(path, { method = "GET", body, signal, retried = false } = {}) {
    if (!fullstack)
      throw new Error(
        "Fitur akun tersedia ketika paket dijalankan melalui npm start.",
      );
    const headers = { Accept: "application/json" };
    if (method !== "GET" && !session.csrf) await refreshSession();
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = session.csrf || "";
    }
    let response;
    try {
      response = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
        signal: signal || AbortSignal.timeout(20000),
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new Error(
        "Koneksi ke server terputus. Pastikan server masih berjalan, lalu coba kembali.",
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Respons server tidak dapat dibaca. Periksa alamat server.",
      );
    }
    if (response.status === 403 && method !== "GET" && !retried) {
      await refreshSession();
      return request(path, { method, body, signal, retried: true });
    }
    if (!response.ok) {
      const error = new Error(result.error || "Permintaan belum berhasil.");
      error.status = response.status;
      if (response.status === 401) updateUser(null);
      throw error;
    }
    if (result.csrf) session.csrf = result.csrf;
    return result;
  }
  function updateUser(user) {
    const previousUser = session.user?.id;
    session.user = user;
    if (previousUser !== user?.id) document.dispatchEvent(new CustomEvent("loka:sessionchange", { detail: user }));
    $$("[data-account-label]").forEach(node => {
      node.textContent = user ? "Akun saya" : "Masuk";
    });
    $$(".account-nav").forEach((node) => {
      node.replaceChildren(
        document.createTextNode(user ? "Akun saya" : "Masuk"),
      );
      node.insertAdjacentHTML("beforeend", arrow);
    });
  }
  async function refreshSession() {
    if (!fullstack) return session;
    try {
      const fresh = await request("/api/session");
      const oldUser = session.user;
      session = { ...fresh, user: oldUser };
      updateUser(fresh.user);
      sessionError = null;
      updateUser(session.user);
    } catch (error) {
      sessionError = error;
    }
    return session;
  }
  const sessionReady = refreshSession();
  function requireLogin() {
    if (session.user) return true;
    toast(
      fullstack
        ? "Masuk ke akun untuk menyimpan hasil."
        : "Penyimpanan akun tersedia pada versi full-stack. Kamu tetap bisa mengekspor hasil.",
    );
    document.dispatchEvent(new Event("loka:requestlogin"));
    return false;
  }
  function download(bytes, name, type = "text/plain;charset=utf-8") {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function copy(text, fallback) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Berhasil disalin.");
      return true;
    } catch {
      if (fallback) {
        fallback.focus();
        fallback.select();
      }
      toast(
        "Penyalinan otomatis dibatasi browser. Pilih teks dan tekan Ctrl+C.",
      );
      return false;
    }
  }
  async function busy(button, run) {
    if (button.disabled) return;
    const previous = [...button.childNodes].map((node) => node.cloneNode(true));
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Sebentar…";
    try {
      return await run();
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.replaceChildren(...previous);
    }
  }
  function lessonCard(lesson, index = 0) {
    const url=`#${esc(lesson.anchor || "bagian-posisi")}`;
    return `<article class="lesson-card"><a class="card-image" href="${url}" tabindex="-1" aria-hidden="true"><img src="assets/img/${esc(lesson.image)}" alt="" width="720" height="600" loading="lazy" decoding="async"><span class="pill">${esc(lesson.category)}</span><span class="round-link">${arrow}</span></a><div class="card-body"><div class="meta"><span>${String(index + 1).padStart(2, "0")} / ${esc(lesson.level)}</span><span>${lesson.time} menit</span></div><h3><a href="${url}">${esc(lesson.title)}</a></h3><p>${esc(lesson.summary)}</p><div class="card-bottom"><span>Modul Foto Produk</span><a class="text-link" href="${url}">Mulai belajar ${arrow}</a></div></div></article>`;
  }
  const menu = $(".menu-toggle"),
    nav = $("#primary-nav");
  function closeMenu() {
    nav?.classList.remove("is-open");
    menu?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-label", "Buka navigasi");
  }
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Tutup navigasi" : "Buka navigasi");
    nav?.classList.toggle("is-open", open);
  });
  document.addEventListener("click", (event) => {
    if (menu && !menu.contains(event.target) && !nav?.contains(event.target))
      closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
    if (
      event.key === "/" &&
      !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !document.querySelector("dialog[open]")
    ) {
      const input =
        $("#search-query") ||
        ($("#nav-query")?.offsetParent ? $("#nav-query") : null);
      if (input) {
        event.preventDefault();
        input.focus();
      }
    }
  });
  const progress = $(".scroll-progress"),
    topButton = $(".to-top");
  let scrolling = false;
  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress)
      progress.value = max > 0 ? Math.min(100, (scrollY / max) * 100) : 0;
    topButton?.classList.toggle("visible", scrollY > 550);
    scrolling = false;
  }
  addEventListener(
    "scroll",
    () => {
      if (!scrolling) {
        scrolling = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  addEventListener("resize", updateScroll, { passive: true });
  updateScroll();
  topButton?.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: reduced() ? "instant" : "smooth" });
    $(".brand")?.focus({ preventScroll: true });
  });
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let savedMotion = false;
  try {
    savedMotion = localStorage.getItem("loka-motion") === "reduce";
  } catch {
    /* Preferences are optional. */
  }
  function reduced() {
    return media.matches || savedMotion;
  }
  function setMotion() {
    document.documentElement.classList.toggle("reduce-motion", reduced());
    $$(".motion-toggle").forEach((b) => {
      b.setAttribute("aria-pressed", String(reduced()));
      b.textContent = reduced() ? "Animasi dikurangi" : "Kurangi animasi";
    });
    if (reduced()) $$(".reveal").forEach((n) => n.classList.add("in-view"));
  }
  setMotion();
  media.addEventListener("change", setMotion);
  $$(".motion-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      if (media.matches) {
        toast("Pengurangan animasi sedang aktif di pengaturan perangkatmu.");
        return;
      }
      savedMotion = !savedMotion;
      try {
        localStorage.setItem("loka-motion", savedMotion ? "reduce" : "full");
      } catch {}
      setMotion();
    }),
  );
  if ("IntersectionObserver" in window && !reduced()) {
    document.body.classList.add("motion-ready");
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            reveal.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px 20px 0px" },
    );
    $$(".reveal").forEach((node) => reveal.observe(node));
    const sceneObserver = new IntersectionObserver((entries) =>
      entries.forEach((entry) =>
        entry.target.classList.toggle("is-offscreen", !entry.isIntersecting),
      ),
    );
    $$(".scene").forEach((node) => sceneObserver.observe(node));
  }
  if (matchMedia("(hover:hover) and (pointer:fine)").matches)
    $$(".tilt-card").forEach((card) => {
      let frame = null,
        last = null;
      card.addEventListener("pointermove", (event) => {
        if (reduced() || card.dataset.flat === "true") return;
        last = { x: event.clientX, y: event.clientY };
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect(),
            x = (last.x - r.left) / r.width - 0.5,
            y = (last.y - r.top) / r.height - 0.5;
          card.classList.add("is-tilting");
          card.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
          card.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
          frame = null;
        });
      });
      card.addEventListener("pointerleave", () => {
        if (frame) cancelAnimationFrame(frame);
        frame = null;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  $$(".password-toggle").forEach((button) =>
    button.addEventListener("click", () => {
      const input = document.getElementById(
          button.getAttribute("aria-controls"),
        ),
        show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
      );
    }),
  );
  const dialog = $("#info-dialog");
  function openDialog(title, html) {
    $("#dialog-title").textContent = title;
    $("#dialog-body").innerHTML = html;
    dialog.showModal();
    document.body.classList.add("dialog-open");
  }
  dialog?.addEventListener("close", () =>
    document.body.classList.remove("dialog-open"),
  );
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  $$("[data-dialog]").forEach((button) =>
    button.addEventListener("click", () => {
      if (button.dataset.dialog === "privacy")
        openDialog(
          "Privasi ruang belajarmu.",
          "<p>Materi dapat dibaca tanpa akun. Pada versi full-stack, akun menyimpan nama, email, hash kata sandi, progres, serta rancangan Studio dalam database server. Cookie sesi diperlukan untuk masuk; kata sandi tidak disimpan di browser.</p><p>Preferensi animasi disimpan pada perangkat. Tidak ada analitik iklan atau pelacak pihak ketiga di dalam paket. Saat kamu membuka sumber, WhatsApp, Instagram, atau Google, kebijakan layanan tersebut berlaku.</p><p>Akun email lokal belum memverifikasi kepemilikan alamat email. Simpan kode pemulihan dengan aman. Kamu dapat mengunduh salinan data melalui pengaturan akun. Hubungi pengelola melalui kanal yang tersedia untuk permintaan penghapusan data.</p>",
        );
      else
        openDialog(
          "Ketentuan penggunaan.",
          "<p>LokaNaik adalah ruang belajar keterampilan digital. Contoh produk dan cerita digunakan untuk latihan, bukan transaksi, testimoni nyata, atau jaminan hasil usaha.</p><p>Gunakan informasi yang benar dan aset yang boleh kamu gunakan. Jangan menyimpan data pelanggan, kata sandi layanan lain, atau informasi rahasia di Studio.</p><p>Rujukan eksternal dikelola penyedianya dan dapat berubah. Penyimpanan akun membutuhkan versi full-stack yang dijalankan pengelola.</p>",
        );
    }),
  );
  $$("[data-story]").forEach((button) =>
    button.addEventListener("click", () => {
      const story = data.stories[Number(button.dataset.story)];
      if (!story) return;
      openDialog(
        story.title,
        `<span class="overline">${esc(story.label)}</span><img src="assets/img/${esc(story.image)}" alt="${esc(story.title)}" width="600" height="300"><p>${esc(story.text)}</p><a class="button primary" href="#${esc(data.lessons.find(l=>l.slug===story.slug)?.anchor || "bagian-posisi")}">Pelajari langkahnya ${arrow}</a>`,
      );
    }),
  );
  function contacts() {
    const root = $("#contact-links");
    if (!root) return;
    const c = window.LOKA_CONFIG.contacts;
    const list = [],
      phone = String(c.phone || "").replace(/[^0-9+]/g, "");
    const paths = {
      WhatsApp:
        '<path d="M21 11a9 9 0 0 1-13 8l-6 3 2-6A9 9 0 1 1 21 11Z"/><path d="M8 10h8m-8 4h5"/>',
      Telepon: '<path d="M5 3H3c-1 11 7 19 18 18v-4l-5-2-3 3-7-7 3-3Z"/>',
      Email:
        '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
      Instagram:
        '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
      Alamat:
        '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    };
    const add = (label, text, url, symbol, external = false) => {
      if (!url) return;
      const glyph = `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[label] || ""}</svg>`;
      list.push(
        `<a class="contact-link" href="${esc(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${glyph}<div><span>${esc(label)}</span><strong>${esc(text)}</strong></div>${arrow}</a>`,
      );
    };
    if (/^\+?[1-9]\d{7,14}$/.test(phone)) {
      add(
        "WhatsApp",
        phone,
        `https://wa.me/${phone.replace("+", "")}`,
        "↗",
        true,
      );
      add("Telepon", phone, `tel:${phone}`, "↗");
    }
    if (c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
      add("Email", c.email, `mailto:${c.email}`, "@");
    if (c.instagram) {
      try {
        const u = new URL(c.instagram);
        if (
          u.protocol === "https:" &&
          ["instagram.com", "www.instagram.com"].includes(u.hostname)
        )
          add(
            "Instagram",
            u.pathname.replaceAll("/", "") || "Instagram",
            u.href,
            "↗",
            true,
          );
      } catch {}
    }
    if (c.address) {
      let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
      try {
        if (c.mapsUrl) {
          const u = new URL(c.mapsUrl);
          if (
            u.protocol === "https:" &&
            ["maps.google.com", "www.google.com", "maps.app.goo.gl"].includes(
              u.hostname,
            )
          )
            url = u.href;
        }
      } catch {}
      add("Alamat", c.address, url, "⌖", true);
    }
    root.innerHTML =
      list.join("") ||
      '<p class="muted">Pengelola belum menambahkan kanal kontak.</p>';
  }
  contacts();
  if (document.body.dataset.page === "belajar") {
    $$("[data-filter]").forEach((button) =>
      button.addEventListener("click", () => {
        const category = button.dataset.filter;
        $$("[data-filter]").forEach((b) => {
          b.classList.toggle("selected", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });
        const lessons = window.LOKA_SEARCH("", category);
        $("#learn-grid").innerHTML = lessons.map(lessonCard).join("");
        $("#learn-count").textContent =
          `${lessons.length} materi${category === "Semua" ? " untuk mulai bertumbuh" : ` dalam ${category}`}`;
      }),
    );
  }
  window.Loka = {
    $,
    $$,
    esc,
    data,
    runtime,
    fullstack,
    request,
    sessionReady,
    refreshSession,
    get session() {
      return session;
    },
    get sessionError() {
      return sessionError;
    },
    updateUser,
    requireLogin,
    toast,
    feedback,
    download,
    copy,
    busy,
    lessonCard,
    openDialog,
    arrow,
    reduced,
  };
})();
