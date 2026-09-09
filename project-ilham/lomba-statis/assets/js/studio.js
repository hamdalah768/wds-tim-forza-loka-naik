(() => {
  "use strict";
  const {
    $,
    $$,
    esc,
    request,
    sessionReady,
    requireLogin,
    feedback,
    download,
    busy,
    toast,
    arrow,
  } = window.Loka;
  const form = $("#studio-form"),
    status = $("#studio-status");
  let currentId = null,
    drafts = [],
    flat = false;
  function values() {
    const f = new FormData(form);
    return {
      title: String(f.get("title") || "").trim(),
      category: String(f.get("category") || ""),
      size: String(f.get("size") || "").trim(),
      description: String(f.get("description") || "").trim(),
      image: String(f.get("image") || "banana.webp"),
    };
  }
  function preview() {
    const value = values();
    $("#preview-title").textContent = value.title || "Nama produkmu";
    $("#preview-category").textContent = value.category;
    $("#preview-size").textContent = value.size || "Ukuran / berat";
    $("#preview-description").textContent =
      value.description || "Tuliskan cerita singkat produkmu di sini.";
    $("#preview-image").src = `assets/img/${value.image}`;
    $("#preview-image").alt =
      `Gambar latihan untuk ${value.title || "kartu produk"}`;
    $("#description-count").value =
      `${form.elements.description.value.length}/600`;
  }
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  preview();
  $("#toggle-3d").addEventListener("click", () => {
    flat = !flat;
    const card = $("#catalog-preview");
    card.dataset.flat = String(flat);
    card.style.setProperty("--rz", flat ? "0deg" : "4deg");
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    $("#toggle-3d").setAttribute("aria-pressed", String(!flat));
    $("#toggle-3d").textContent = flat
      ? "Perspektif 3D nonaktif"
      : "Perspektif 3D aktif";
  });
  function drawDrafts() {
    $("#draft-count").textContent = `${drafts.length} rancangan`;
    const root = $("#draft-list");
    if (!drafts.length) {
      root.innerHTML =
        '<div class="empty-state"><h3>Ide pertamamu ditunggu.</h3><p>Isi kartu di atas, lalu simpan rancanganmu.</p></div>';
      return;
    }
    root.innerHTML = drafts
      .map(
        (d) =>
          `<article class="draft-card"><img src="assets/img/${esc(d.image)}" alt="Gambar rancangan ${esc(d.title)}" width="600" height="300" loading="lazy"><span class="overline">${esc(d.category)}</span><h3>${esc(d.title)}</h3><p>${esc(d.size)} · Disimpan ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d.updated_at)}</p><div class="draft-actions"><button class="button outline small" data-load="${esc(d.id)}">Buka rancangan ${arrow}</button><button class="text-button" data-delete="${esc(d.id)}" aria-label="Hapus rancangan ${esc(d.title)}">Hapus</button></div></article>`,
      )
      .join("");
  }
  async function loadDrafts() {
    await sessionReady;
    const owner=window.Loka.session.user?.id;
    if (!window.Loka.session.user) return;
    try {
      const response=await request("/api/drafts");
      if(owner!==window.Loka.session.user?.id)return;
      drafts = response.drafts;
      drawDrafts();
    } catch (error) {
      $("#draft-list").innerHTML =
        '<div class="empty-state"><p id="draft-load-error"></p><button class="button outline" id="reload-drafts">Coba lagi</button></div>';
      $("#draft-load-error").textContent = error.message;
      $("#reload-drafts").addEventListener("click", loadDrafts);
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sessionReady;
    if (!requireLogin()) {
      feedback(
        status,
        "Tekan Masuk untuk menyimpan rancangan. Kamu dapat mengunduh kartu sekarang.",
        true,
      );
      return;
    }
    await busy($("#save-draft"), async () => {
      try {
        const value = values();
        const response = await request(
          currentId ? `/api/drafts/${currentId}` : "/api/drafts",
          { method: currentId ? "PUT" : "POST", body: value },
        );
        currentId = response.id || currentId;
        feedback(status, "Rancangan berhasil disimpan di akunmu.");
        await loadDrafts();
      } catch (error) {
        feedback(status, error.message, true);
      }
    });
    $("#save-draft").textContent = currentId
      ? "Simpan perubahan"
      : "Simpan ke akun";
  });
  $("#new-draft").addEventListener("click", () => {
    form.reset();
    currentId = null;
    preview();
    $("#save-draft").textContent = "Simpan ke akun";
    feedback(
      status,
      "Rancangan baru siap diedit. Perubahan lama tetap ada pada salinan yang sudah disimpan.",
    );
    $("#product-name").focus();
  });
  $("#draft-list").addEventListener("click", async (event) => {
    const load = event.target.closest("[data-load]"),
      del = event.target.closest("[data-delete]");
    if (load) {
      const draft = drafts.find((d) => d.id === load.dataset.load);
      if (!draft) return;
      currentId = draft.id;
      for (const key of ["title", "category", "size", "description"])
        form.elements[key].value = draft[key];
      const radio = $$("#studio-form input[name=image]").find(
        (r) => r.value === draft.image,
      );
      if (radio) radio.checked = true;
      preview();
      $("#save-draft").textContent = "Simpan perubahan";
      feedback(
        status,
        "Rancangan dimuat. Ubah isinya, lalu pilih Simpan perubahan.",
      );
      form.scrollIntoView({
        behavior: window.Loka.reduced() ? "instant" : "smooth",
        block: "start",
      });
      $("#product-name").focus({ preventScroll: true });
    }
    if (del) {
      const draft = drafts.find((d) => d.id === del.dataset.delete);
      if (!draft) return;
      window.Loka.openDialog(
        "Hapus rancangan ini?",
        `<p>Rancangan <strong>${esc(draft.title)}</strong> akan dihapus dari akunmu.</p><div class="button-row"><button class="button primary" id="confirm-delete-draft">Hapus rancangan</button><button class="button outline" id="cancel-delete-draft">Batalkan</button></div>`,
      );
      $("#cancel-delete-draft").addEventListener("click", () =>
        $("#info-dialog").close(),
      );
      $("#confirm-delete-draft").addEventListener("click", async () => {
        await busy($("#confirm-delete-draft"), async () => {
          try {
            await request(`/api/drafts/${draft.id}`, { method: "DELETE" });
            if (currentId === draft.id) {
              currentId = null;
              $("#save-draft").textContent = "Simpan ke akun";
            }
            $("#info-dialog").close();
            toast("Rancangan dihapus.");
            await loadDrafts();
          } catch (error) {
            toast(error.message);
          }
        });
      });
    }
  });
  function credit(image) {
    return image === "banana.webp"
      ? "Foto: Barthateslisa — Banana Chips from India. CC BY-SA 4.0.\nhttps://commons.wikimedia.org/wiki/File:Banana_Chips_from_India.jpg\nhttps://creativecommons.org/licenses/by-sa/4.0/\nDiubah: ukuran, format, dan pemotongan bingkai. Turunan foto: CC BY-SA 4.0."
      : "Ilustrasi dari desain Stitch yang disediakan pemilik proyek.\nStatus lisensi terbuka belum terverifikasi. Lihat docs/SUMBER-ASET.md.";
  }
  $("#export-text").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const v = values();
    download(
      `LOKANAIK — RANCANGAN LATIHAN\n\n${v.title}\n${v.category} · ${v.size}\n\n${v.description}\n\n${credit(v.image)}\n`,
      "lokanaik-rancangan.txt",
    );
    toast("Teks rancangan diunduh.");
  });
  function lines(ctx, text, width) {
    const output = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const character of paragraph) {
        const next = line + character;
        if (ctx.measureText(next).width > width && line) {
          output.push(line.trim());
          line = character;
        } else line = next;
      }
      output.push(line.trim());
    }
    return output;
  }
  async function exportCard() {
    if (!form.reportValidity()) return;
    await busy($("#export-card"), async () => {
      try {
        const v = values(),
          img = new Image();
        img.src = `assets/img/${v.image}`;
        await img.decode();
        await document.fonts.ready;
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 1600;
        let ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Ekspor gambar tidak didukung browser ini.");
        ctx.font = '800 56px "Plus Jakarta Sans", sans-serif';
        const titleLines = lines(ctx, v.title, 800);
        ctx.font = '400 29px "Plus Jakarta Sans", sans-serif';
        const descriptionLines = lines(ctx, v.description, 800);
        ctx.font = '400 17px "Plus Jakarta Sans", sans-serif';
        const credits = lines(ctx, credit(v.image), 800);
        canvas.height =
          1100 +
          titleLines.length * 68 +
          descriptionLines.length * 45 +
          credits.length * 27;
        ctx = canvas.getContext("2d");
        ctx.fillStyle = "#e7fbf2";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(45, 45, 910, canvas.height - 90, 34);
        ctx.fill();
        ctx.fillStyle = "#005b45";
        ctx.font = '800 23px "Plus Jakarta Sans", sans-serif';
        ctx.fillText("LOKA / STUDIO", 100, 111);
        const x = 90,
          y = 145,
          w = 820,
          h = 490,
          ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight),
          dw = img.naturalWidth * ratio,
          dh = img.naturalHeight * ratio;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 25);
        ctx.clip();
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.restore();
        let cursor = 690;
        ctx.fillStyle = "#52685e";
        ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(v.category.toUpperCase(), 100, cursor);
        cursor += 65;
        ctx.fillStyle = "#103e31";
        ctx.font = '800 56px "Plus Jakarta Sans", sans-serif';
        for (const line of titleLines) {
          ctx.fillText(line, 100, cursor);
          cursor += 68;
        }
        cursor += 7;
        ctx.fillStyle = "#005b45";
        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(v.size, 100, cursor);
        cursor += 59;
        ctx.fillStyle = "#52685e";
        ctx.font = '400 29px "Plus Jakarta Sans", sans-serif';
        for (const line of descriptionLines) {
          ctx.fillText(line, 100, cursor);
          cursor += 45;
        }
        cursor += 34;
        ctx.strokeStyle = "#c6dccb";
        ctx.beginPath();
        ctx.moveTo(100, cursor);
        ctx.lineTo(900, cursor);
        ctx.stroke();
        cursor += 40;
        ctx.fillStyle = "#005b45";
        ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
        ctx.fillText("RANCANGAN LATIHAN · LOKANAIK", 100, cursor);
        cursor += 38;
        ctx.fillStyle = "#52685e";
        ctx.font = '400 17px "Plus Jakarta Sans", sans-serif';
        for (const line of credits) {
          ctx.fillText(line, 100, cursor);
          cursor += 27;
        }
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) throw new Error("Gambar belum dapat diekspor.");
        download(blob, "lokanaik-kartu-produk.png");
        toast("Kartu PNG berhasil diunduh.");
      } catch (error) {
        feedback(
          status,
          error.message.includes("tainted")
            ? "Jalankan lewat npm start atau npm run start:static untuk mengekspor gambar."
            : error.message,
          true,
        );
      }
    });
  }
  $("#export-card").addEventListener("click", exportCard);
  loadDrafts();
  document.addEventListener("loka:sessionchange",()=>{drafts=[];currentId=null;form.reset();preview();drawDrafts();loadDrafts();});
})();
