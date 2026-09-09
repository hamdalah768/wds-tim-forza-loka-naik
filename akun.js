(() => {
  "use strict";
  const {
    $,
    $$,
    data,
    esc,
    fullstack,
    request,
    refreshSession,
    feedback,
    busy,
    copy,
    download,
    toast,
    arrow,
  } = window.Loka;
  const panels = [
    "account-loading",
    "account-error",
    "static-account",
    "auth-panel",
    "account-dashboard",
  ];
  let activeTab = "login";
  function panel(id) {
    for (const name of panels) $(`#${name}`).hidden = name !== id;
  }
  function tab(name) {
    activeTab = name;
    ["login", "register", "recover"].forEach(
      (id) => ($(`#${id}-panel`).hidden = id !== name),
    );
    $$(".auth-tabs [data-auth-tab]").forEach((button) => {
      const selected = button.dataset.authTab === name;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $(".auth-tabs").hidden = name === "recover";
    $("#google-option").hidden =
      name === "recover";
    const available=window.Loka.session.providers || {};
    $("#google-login").disabled=!window.Loka.session.google;
    $("#facebook-login").disabled=!available.facebook;
    $("#phone-login").disabled=!available.phone;
    $("#provider-status").textContent=(!window.Loka.session.google||!available.facebook||!available.phone)?"Metode berwarna redup belum diaktifkan. Daftar atau masuk dengan email untuk melanjutkan.":"Pilih metode masuk yang terhubung dengan akunmu.";
    feedback($("#auth-feedback"), "");
  }
  $$("[data-auth-tab]").forEach((button) =>
    button.addEventListener("click", () => tab(button.dataset.authTab)),
  );
  $(".auth-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const name =
      event.key === "Home"
        ? "login"
        : event.key === "End"
          ? "register"
          : activeTab === "login"
            ? "register"
            : "login";
    tab(name);
    $(`#${name}-tab`).focus();
  });
  async function dashboard() {
    const user = window.Loka.session.user;
    if (!user) {
      panel("auth-panel");
      tab(activeTab);
      return;
    }
    panel("account-dashboard");
    $("#welcome-name").textContent = `Hai, ${user.name}.`;
    $("#user-email").textContent = user.email || user.phone || "Akun Facebook";
    $("#user-initial").textContent = [...user.name][0].toLocaleUpperCase("id");
    $("#profile-name").value = user.name;
    $("#password-form").hidden = user.provider !== "password";
    $("#email-status").textContent = user.emailVerified
      ? "Alamat email telah diverifikasi oleh Google."
      : user.provider === "password" ? "Email belum diverifikasi. Simpan kode pemulihan di tempat pribadi." : "Identitas akun diverifikasi melalui metode masuk yang dipilih.";
    $("#account-progress").textContent = "Memuat progres…";
    try {
      const [progress, drafts] = await Promise.all([
        request("/api/progress"),
        request("/api/drafts"),
      ]);
      const rows = progress.progress;
      $("#completed-count").textContent = rows.filter(
        (r) => r.completed,
      ).length;
      $("#account-draft-count").textContent = drafts.drafts.length;
      $("#account-progress").innerHTML = rows.length
        ? rows
            .map((row) => {
              const lesson = data.lessons.find((l) => l.slug === row.lesson);
              if (!lesson) return "";
              return `<a href="#${esc(lesson.anchor || "bagian-posisi")}" data-close-auth><span>${esc(lesson.title)}</span><strong>${row.completed ? "Selesai ✓" : `${row.tasks.filter(Boolean).length}/3`}</strong>${arrow}</a>`;
            })
            .join("")
        : '<p class="muted">Belum ada progres tersimpan. Pilih satu materi untuk mulai.</p>';
    } catch (error) {
      $("#account-progress").textContent = error.message;
    }
  }
  const recovery = $("#recovery-dialog");
  function showRecovery(code) {
    $("#new-recovery-code").value = code;
    $("#saved-recovery").checked = false;
    $("#close-recovery").disabled = true;
    recovery.showModal();
    document.body.classList.add("dialog-open");
  }
  $("#copy-recovery").addEventListener("click", () =>
    copy($("#new-recovery-code").value, $("#new-recovery-code")),
  );
  $("#saved-recovery").addEventListener(
    "change",
    () => ($("#close-recovery").disabled = !$("#saved-recovery").checked),
  );
  $("#close-recovery").addEventListener("click", () => recovery.close());
  recovery.addEventListener("cancel", (event) => {
    if (!$("#saved-recovery").checked) {
      event.preventDefault();
      toast("Simpan kode pemulihan dan centang konfirmasi terlebih dahulu.");
    }
  });
  recovery.addEventListener("close", () => {
    $("#new-recovery-code").value = "";
    if(!$("#auth-dialog").open)document.body.classList.remove("dialog-open");
  });
  for (const name of ["login", "register", "recover"]) {
    const form = $(`#${name}-form`);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      delete values.consent;
      await busy($("button[type=submit]", form), async () => {
        try {
          const result = await request(`/api/auth/${name}`, {
            method: "POST",
            body: values,
          });
          window.Loka.updateUser(result.user);
          form.reset();
          await dashboard();
          if (result.recoveryCode) showRecovery(result.recoveryCode);
          else toast("Berhasil masuk. Selamat melanjutkan belajar.");
        } catch (error) {
          feedback($("#auth-feedback"), error.message, true);
        }
      });
    });
  }
  $("#google-login").addEventListener("click", async () => {
    await busy($("#google-login"), async () => {
      try {
        const result = await request("/api/auth/google", {
          method: "POST",
          body: {},
        });
        const url = new URL(result.url);
        if (url.protocol !== "https:" || url.hostname !== "accounts.google.com")
          throw new Error("Tujuan login tidak valid.");
        location.assign(url.href);
      } catch (error) {
        feedback($("#auth-feedback"), error.message, true);
      }
    });
  });
  $("#logout").addEventListener("click", async () => {
    await busy($("#logout"), async () => {
      try {
        await request("/api/auth/logout", { method: "POST", body: {} });
        window.Loka.updateUser(null);
        await refreshSession();
        tab("login");
        panel("auth-panel");
        toast("Kamu sudah keluar.");
      } catch (error) {
        toast(error.message);
      }
    });
  });
  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await busy($("button[type=submit]", form), async () => {
      try {
        const result = await request("/api/profile", {
          method: "PUT",
          body: { name: form.elements.name.value },
        });
        window.Loka.updateUser(result.user);
        $("#welcome-name").textContent = `Hai, ${result.user.name}.`;
        $("#user-initial").textContent = [
          ...result.user.name,
        ][0].toLocaleUpperCase("id");
        feedback($(".feedback", form), "Nama diperbarui.");
      } catch (error) {
        feedback($(".feedback", form), error.message, true);
      }
    });
  });
  $("#password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await busy($("button[type=submit]", form), async () => {
      try {
        const result = await request("/api/auth/password", {
          method: "POST",
          body: Object.fromEntries(new FormData(form)),
        });
        form.reset();
        feedback(
          $(".feedback", form),
          "Kata sandi diganti. Sesi pada perangkat lain sudah keluar.",
        );
        showRecovery(result.recoveryCode);
      } catch (error) {
        feedback($(".feedback", form), error.message, true);
      }
    });
  });
  $("#export-account").addEventListener("click", async () => {
    await busy($("#export-account"), async () => {
      try {
        const result = await request("/api/account/export");
        download(
          JSON.stringify(result, null, 2),
          "lokanaik-data-akun.json",
          "application/json",
        );
        toast("Salinan data akun diunduh. Simpan secara pribadi.");
      } catch (error) {
        toast(error.message);
      }
    });
  });
  async function boot(retry = false) {
    panel("account-loading");
    if (!fullstack) {
      panel("static-account");
      return;
    }
    if (retry) await refreshSession();
    else await window.Loka.sessionReady;
    if (window.Loka.sessionError) {
      panel("account-error");
      $("#account-error-text").textContent = window.Loka.sessionError.message;
      return;
    }
    if (window.Loka.session.user) await dashboard();
    else {
      panel("auth-panel");
      tab("login");
    }
    const auth = new URLSearchParams(location.search).get("auth");
    if (auth) {
      document.dispatchEvent(new Event("loka:requestlogin"));
      const messages = {
        facebook_failed: "Login Facebook belum berhasil atau dibatalkan. Coba kembali.",
        use_existing: "Email ini sudah memiliki akun. Masuk dengan metode yang sebelumnya dipakai.",
        google_failed:
          "Login Google belum berhasil atau dibatalkan. Coba kembali.",
        use_password:
          "Alamat ini sudah digunakan oleh akun email. Masuk dengan kata sandi akun tersebut.",
      };
      feedback(
        $("#auth-feedback"),
        messages[auth] || "Proses masuk belum berhasil.",
        true,
      );
      const url = new URL(location.href);
      url.searchParams.delete("auth");
      history.replaceState({}, "", url);
    }
  }
  $("#retry-session").addEventListener("click", () => boot(true));
  document.addEventListener('loka:authopen',()=>boot(true));
  document.addEventListener('loka:progresssaved',()=>{if($('#auth-dialog').open&&window.Loka.session.user)dashboard();});
  $('#facebook-login').addEventListener('click',()=>busy($('#facebook-login'),async()=>{
    try{const r=await request('/api/auth/facebook',{method:'POST',body:{}});const u=new URL(r.url);if(u.protocol!=='https:'||u.hostname!=='www.facebook.com')throw Error('Tujuan tidak valid.');location.assign(u.href);}catch(e){feedback($('#auth-feedback'),e.message,true);}
  }));
  $('#phone-login').addEventListener('click',()=>{const form=$('#phone-form');form.hidden=!form.hidden;if(!form.hidden)$('#phone-number').focus();});
  $('#send-otp').addEventListener('click',()=>busy($('#send-otp'),async()=>{
    if(!$('#phone-number').reportValidity())return;
    try{const r=await request('/api/auth/phone/send',{method:'POST',body:{phone:$('#phone-number').value}});$('#otp-fields').hidden=false;$('#otp-code').required=true;$('#otp-code').focus();feedback($('#phone-feedback'),'Kode dikirim ke '+r.masked+'.');}catch(e){feedback($('#phone-feedback'),e.message,true);}
  }));
  $('#phone-form').addEventListener('submit',e=>{e.preventDefault();busy($('#phone-form button[type=submit]'),async()=>{
    try{const r=await request('/api/auth/phone/check',{method:'POST',body:{code:$('#otp-code').value}});window.Loka.updateUser(r.user);$('#phone-form').reset();$('#otp-fields').hidden=true;await dashboard();toast('Berhasil masuk.');}catch(e){feedback($('#phone-feedback'),e.message,true);}
  });});
  boot();
})();
