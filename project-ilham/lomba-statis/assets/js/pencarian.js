(() => {
  "use strict";
  const { $, $$, data, fullstack, request, lessonCard, feedback } = window.Loka;
  const input = $("#search-query"),
    results = $("#search-results"),
    count = $("#search-count"),
    empty = $("#search-empty"),
    sort = $("#search-sort");
  const destinations=[{title:"Studio Katalog",summary:"Susun, simpan, dan unduh kartu produk.",anchor:"studio",words:"studio katalog etalase produk simpan unduh"},{title:"Pertanyaan & jawaban",summary:"Temukan bantuan tentang materi dan akun.",anchor:"faq",words:"bantuan pertanyaan faq jawaban"},{title:"Kontak & lokasi",summary:"Buka kontak pengelola dan informasi alamat.",anchor:"kontak",words:"alamat lokasi kontak whatsapp instagram telepon sosmed"}];
  let category = "Semua",
    controller = null,
    sequence = 0,
    timer;
  function readUrl() {
    const p = new URLSearchParams(location.search);
    input.value = (p.get("q") || "").slice(0, 100);
    category = data.categories.includes(p.get("kategori"))
      ? p.get("kategori")
      : "Semua";
    sort.value = p.get("urut") === "durasi" ? "durasi" : "relevansi";
    mark();
  }
  function mark() {
    $$("[data-filter]").forEach((b) => {
      const selected = b.dataset.filter === category;
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
  }
  function updateHashAllowed(){return document.activeElement?.closest("#pencarian");}
  function writeUrl(push = false) {
    const url = new URL(location.href);
    ["q","kategori","urut"].forEach(key=>url.searchParams.delete(key));
    if (updateHashAllowed()) url.hash = "pencarian";
    if (input.value.trim()) url.searchParams.set("q", input.value.trim());
    if (category !== "Semua") url.searchParams.set("kategori", category);
    if (sort.value !== "relevansi") url.searchParams.set("urut", sort.value);
    try {
      history[push ? "pushState" : "replaceState"]({}, "", url);
    } catch {
      /* file:// keeps functional local search even when History is restricted */
    }
  }
  async function search(push = false, updateUrl = true) {
    clearTimeout(timer);
    if (updateUrl) writeUrl(push);
    mark();
    const run = ++sequence;
    controller?.abort();
    controller = new AbortController();
    const q = input.value.trim();
    results.setAttribute("aria-busy", "true");
    count.textContent = "Mencari materi…";
    try {
      let lessons;
      lessons = window.LOKA_SEARCH(q, category, sort.value);
      if (run !== sequence) return;
      const terms=q.toLocaleLowerCase("id").split(/\s+/).filter(Boolean);
      const quick=category==="Semua"&&terms.length?destinations.filter(x=>terms.every(t=>(x.title+" "+x.words).toLowerCase().includes(t))):[];
      const total=lessons.length+quick.length;
      results.innerHTML = lessons.map(lessonCard).join("")+quick.map(x=>`<article class="lesson-card search-destination"><div class="card-body"><h3><a href="#${x.anchor}">${x.title}</a></h3><p>${x.summary}</p><a class="text-link" href="#${x.anchor}">Buka bagian ini →</a></div></article>`).join("");
      empty.hidden = total > 0;
      results.hidden = !total;
      count.classList.remove("error");
      count.textContent = `${total} hasil${q ? ` untuk “${q}”` : " tersedia"}${category !== "Semua" ? ` · ${category}` : ""}`;
    } catch (error) {
      if (error.name === "AbortError" || run !== sequence) return;
      results.replaceChildren();
      results.hidden = true;
      empty.hidden = true;
      feedback(
        count,
        `${error.message} Tekan Cari untuk mencoba kembali.`,
        true,
      );
    } finally {
      if (run === sequence) results.removeAttribute("aria-busy");
    }
  }
  $("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    search(true);
  });
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => search(), 250);
  });
  $$("[data-query]").forEach((b) =>
    b.addEventListener("click", () => {
      input.value = b.dataset.query;
      search(true);
    }),
  );
  $$("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      category = b.dataset.filter;
      search(true);
    }),
  );
  sort.addEventListener("change", () => search(true));
  $("#reset-search").addEventListener("click", () => {
    input.value = "";
    category = "Semua";
    sort.value = "relevansi";
    search(true);
    input.focus();
  });
  addEventListener("popstate", () => {
    readUrl();
    search(false, false);
  });
  readUrl();
  search(false, false);
})();
