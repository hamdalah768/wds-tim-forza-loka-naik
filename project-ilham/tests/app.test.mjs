import { test } from "node:test";
import assert from "node:assert/strict";
import { inject } from "./http-harness.mjs";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
import { createStaticServer } from "../server/static.mjs";
import { digest } from "../server/security.mjs";
const origin = "http://localhost:3000";
const pass = "Jendela hijau untuk usaha 2026!";
class Client {
  constructor(port) {
    this.port = port;
    this.cookie = "";
    this.csrf = "";
  }
  async call(path, { method = "GET", body, headers = {}, raw } = {}) {
    const payload = raw ?? (body === undefined ? "" : JSON.stringify(body));
    const h = {
      Host: "localhost:3000",
      ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...(!["GET", "HEAD"].includes(method)
        ? {
            "Content-Type": "application/json",
            Origin: origin,
            "X-CSRF-Token": this.csrf,
          }
        : {}),
      ...headers,
    };
    if (payload) h["Content-Length"] = Buffer.byteLength(payload);
    const result = await inject(this.port, path, {method, headers: h, payload});
    if (result.headers["set-cookie"])
      this.cookie = result.headers["set-cookie"][0].split(";")[0];
    if (result.data?.csrf) this.csrf = result.data.csrf;
    return result;
  }
  async start() {
    return this.call("/api/session");
  }
  async register(email, name = "Teman Loka") {
    return this.call("/api/auth/register", {
      method: "POST",
      body: { name, email, password: pass },
    });
  }
}
async function start(options = {}) {
  const app = createApp({
    origin,
    database: ":memory:",
    limitMultiplier: 100,
    ...options,
  });
  return { ...app, port: app.server };
}
async function close(server) {
  server.emit("close");
}
test("Alur full-stack dan batas keamanan", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "loka-test-"));
  const file = join(dir, "test.sqlite");
  const app = await start({ database: file });
  t.after(async () => {
    await close(app.server);
    await rm(dir, { recursive: true, force: true });
  });
  const a = new Client(app.port),
    b = new Client(app.port);
  let recovery, draftId, oldCookie;
  await t.test(
    "satu halaman dan pengalihan seluruh tautan lama tersedia",
    async () => {
      for (const page of [
        "index",
        "belajar",
        "materi",
        "studio",
        "cerita",
        "pencarian",
        "akun",
      ]) {
        const r = await a.call(`/${page}.html`);
        if(page==="index"){assert.equal(r.status,200);assert.match(r.text,/<html lang="id">/);}else{assert.equal(r.status,303);assert.match(r.headers.location,/^\/.*#/);}
      }
      assert.match((await a.call("/runtime.js")).text, /fullstack/);
      assert.equal((await a.call("/assets/js/app.js")).status, 200);
      assert.equal((await a.call("/assets/img/banana.webp")).status, 200);
    },
  );
  await t.test("header CSP, anti-frame, no-sniff, dan cache akun", async () => {
    const r = await a.start();
    assert.equal(r.status, 200);
    assert.match(r.headers["content-security-policy"], /script-src 'self'/);
    assert.match(
      r.headers["content-security-policy"],
      /frame-ancestors 'none'/,
    );
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.equal(r.headers["cache-control"], "no-store");
    assert.match(r.headers["set-cookie"][0], /HttpOnly/);
    assert.match(r.headers["set-cookie"][0], /SameSite=Lax/);
    assert.equal(r.data.user, null);
    assert.equal(r.data.csrf.length, 43);
  });
  await t.test(
    "pencarian huruf besar, kata gabungan, kategori, dan kosong",
    async () => {
      const q = await a.call("/api/search?q=FOTO%20produk");
      assert.equal(q.status, 200);
      assert.ok(q.data.total >= 2);
      assert.ok(q.data.lessons.some((l) => l.slug === "cahaya-jendela"));
      const safe = await a.call("/api/search?q=reflektor");
      assert.ok(safe.data.lessons.some((l) => l.slug === "reflektor-sederhana"));
      const filter = await a.call("/api/search?kategori=Foto%20Produk");
      assert.equal(filter.data.total, 3);
      const none = await a.call("/api/search?q=zzztidakada");
      assert.equal(none.data.total, 0);
      const sort = await a.call("/api/search?urut=durasi");
      assert.equal(sort.data.lessons[0].time, 8);
      assert.equal((await a.call("/api/search?kategori=asing")).status, 400);
      assert.equal(
        (await a.call("/api/search?q=" + "a".repeat(101))).status,
        400,
      );
    },
  );
  await t.test(
    "CSRF dan Origin asing ditolak sebelum akun dibuat",
    async () => {
      const body = { email: "a@example.test", name: "Akun A", password: pass };
      assert.equal(
        (
          await a.call("/api/auth/register", {
            method: "POST",
            body,
            headers: { "X-CSRF-Token": "" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await a.call("/api/auth/register", {
            method: "POST",
            body,
            headers: { Origin: "https://asing.example" },
          })
        ).status,
        403,
      );
      assert.equal(
        (await a.call("/api/session", { headers: { Host: "asing.example" } }))
          .status,
        403,
      );
      assert.equal(
        app.db.prepare("SELECT count(*) AS n FROM users").get().n,
        0,
      );
    },
  );
  await t.test("validasi kata sandi dan JSON", async () => {
    assert.equal(
      (
        await a.call("/api/auth/register", {
          method: "POST",
          body: { email: "a@example.test", name: "Akun A", password: "pendek" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await a.call("/api/auth/register", { method: "POST", raw: "{" })).status,
      400,
    );
    assert.equal(
      (await a.call("/api/auth/register", { method: "POST", raw: "[]" }))
        .status,
      400,
    );
    assert.equal(
      (
        await a.call("/api/auth/register", {
          method: "POST",
          body: {},
          headers: { "Content-Type": "text/plain" },
        })
      ).status,
      415,
    );
    assert.equal(
      (
        await a.call("/api/auth/register", {
          method: "POST",
          body: { large: "x".repeat(17000) },
        })
      ).status,
      413,
    );
  });
  await t.test(
    "registrasi nyata, rotasi sesi, hash password & recovery",
    async () => {
      oldCookie = a.cookie;
      const r = await a.register("a@example.test", "Akun A");
      assert.equal(r.status, 201);
      recovery = r.data.recoveryCode;
      assert.equal(recovery.length, 32);
      assert.equal(r.data.user.email, "a@example.test");
      assert.equal(r.data.user.emailVerified, false);
      assert.notEqual(a.cookie, oldCookie);
      const row = app.db
        .prepare("SELECT * FROM users WHERE email=?")
        .get("a@example.test");
      assert.match(row.password_hash, /^scrypt\$131072\$8\$1\$/);
      assert.notEqual(row.password_hash, pass);
      assert.equal(row.recovery_hash, digest(recovery));
      assert.equal(r.data.user.password_hash, undefined);
      const old = new Client(app.port);
      old.cookie = oldCookie;
      assert.equal((await old.call("/api/drafts")).status, 401);
      await b.start();
      assert.equal((await b.register("b@example.test", "Akun B")).status, 201);
    },
  );
  await t.test("progres divalidasi lalu disimpan khusus pemilik", async () => {
    const body = {
      lesson: "cahaya-jendela",
      tasks: [true, true, false],
      completed: true,
      answer: 0,
    };
    assert.equal(
      (await a.call("/api/progress", { method: "PUT", body })).status,
      400,
    );
    assert.equal(
      (
        await a.call("/api/progress", {
          method: "PUT",
          body: { ...body, lesson: "tidak-ada" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await a.call("/api/progress", {
          method: "PUT",
          body: { ...body, tasks: [true, true, true], completed: "true" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await a.call("/api/progress", {
          method: "PUT",
          body: { ...body, tasks: [true, true, true] },
        })
      ).status,
      200,
    );
    const r = await a.call("/api/progress");
    assert.equal(r.data.progress[0].completed, true);
    assert.deepEqual(r.data.progress[0].tasks, [true, true, true]);
    assert.equal((await b.call("/api/progress")).data.progress.length, 0);
  });
  await t.test(
    "rancangan CRUD, isolasi antarakun, dan parameter SQL",
    async () => {
      const body = {
        title: "Keripik ' OR 1=1 --",
        category: "Makanan lokal",
        description: "Informasi contoh untuk uji penyimpanan.",
        size: "100 gram",
        image: "banana.webp",
      };
      const r = await a.call("/api/drafts", { method: "POST", body });
      assert.equal(r.status, 201);
      draftId = r.data.id;
      assert.equal((await b.call("/api/drafts")).data.drafts.length, 0);
      assert.equal(
        (
          await b.call(`/api/drafts/${draftId}`, {
            method: "PUT",
            body: { ...body, title: "Diubah orang lain" },
          })
        ).status,
        404,
      );
      assert.equal(
        (await b.call(`/api/drafts/${draftId}`, { method: "DELETE" })).status,
        404,
      );
      const update = {
        ...body,
        title: "Kartu pisang diperbarui",
        description: "<img src=x onerror=alert(1)> disimpan sebagai teks.",
      };
      assert.equal(
        (
          await a.call(`/api/drafts/${draftId}`, {
            method: "PUT",
            body: update,
          })
        ).status,
        200,
      );
      assert.equal(
        (await a.call("/api/drafts")).data.drafts[0].title,
        update.title,
      );
      assert.equal(
        app.db.prepare("SELECT count(*) AS n FROM users").get().n,
        2,
      );
      assert.equal(
        (
          await a.call("/api/drafts", {
            method: "POST",
            body: { ...body, image: "../../.env" },
          })
        ).status,
        400,
      );
    },
  );
  await t.test("profil dan ekspor data tidak membocorkan rahasia", async () => {
    assert.equal(
      (
        await a.call("/api/profile", {
          method: "PUT",
          body: { name: "Teman Baru" },
        })
      ).status,
      200,
    );
    const r = await a.call("/api/account/export");
    assert.equal(r.data.user.name, "Teman Baru");
    assert.equal(r.data.drafts.length, 1);
    assert.doesNotMatch(r.text, /password_hash|recovery_hash|token_hash|csrf/);
  });
  await t.test(
    "logout mencabut sesi, login salah generik, login benar bekerja",
    async () => {
      const cookie = a.cookie;
      assert.equal(
        (await a.call("/api/auth/logout", { method: "POST", body: {} })).status,
        200,
      );
      const old = new Client(app.port);
      old.cookie = cookie;
      assert.equal((await old.call("/api/account/export")).status, 401);
      await a.start();
      const r = await a.call("/api/auth/login", {
        method: "POST",
        body: { email: "a@example.test", password: "Kata sandi yang salah!" },
      });
      assert.equal(r.status, 401);
      assert.equal(r.data.error, "Email atau kata sandi tidak cocok.");
      assert.equal(
        (
          await a.call("/api/auth/login", {
            method: "POST",
            body: { email: "a@example.test", password: pass },
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "pemulihan merotasi kode dan mencabut seluruh sesi lama",
    async () => {
      const old = new Client(app.port);
      old.cookie = a.cookie;
      old.csrf = a.csrf;
      const anon = new Client(app.port);
      await anon.start();
      assert.equal(
        (
          await anon.call("/api/auth/recover", {
            method: "POST",
            body: {
              email: "a@example.test",
              recoveryCode: "kode-yang-pasti-tidak-cocok",
              password: "Kata sandi baru untuk akun A!",
            },
          })
        ).status,
        400,
      );
      const r = await anon.call("/api/auth/recover", {
        method: "POST",
        body: {
          email: "a@example.test",
          recoveryCode: recovery,
          password: "Kata sandi baru untuk akun A!",
        },
      });
      assert.equal(r.status, 200);
      assert.notEqual(r.data.recoveryCode, recovery);
      assert.equal((await old.call("/api/drafts")).status, 401);
      const another = new Client(app.port);
      await another.start();
      assert.equal(
        (
          await another.call("/api/auth/recover", {
            method: "POST",
            body: {
              email: "a@example.test",
              recoveryCode: recovery,
              password: "Kata sandi berbeda lagi!",
            },
          })
        ).status,
        400,
      );
      a.cookie = anon.cookie;
      a.csrf = anon.csrf;
    },
  );
  await t.test("ganti kata sandi memerlukan kata sandi saat ini", async () => {
    assert.equal(
      (
        await a.call("/api/auth/password", {
          method: "POST",
          body: {
            currentPassword: "yang salah",
            password: "Kata sandi final akun A!",
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await a.call("/api/auth/password", {
          method: "POST",
          body: {
            currentPassword: "Kata sandi baru untuk akun A!",
            password: "Kata sandi final akun A!",
          },
        })
      ).status,
      200,
    );
  });
  await t.test("hapus rancangan milik sendiri", async () => {
    assert.equal(
      (await a.call(`/api/drafts/${draftId}`, { method: "DELETE" })).status,
      200,
    );
    assert.equal((await a.call("/api/drafts")).data.drafts.length, 0);
  });
  await t.test("berkas rahasia dan traversal tidak disajikan", async () => {
    for (const path of [
      "/.env",
      "/data/lokanaik.sqlite",
      "/server/app.mjs",
      "/package.json",
      "/assets/%2e%2e/%2e%2e/.env",
      "/assets/%2f..%2f..%2fdata/lokanaik.sqlite",
    ])
      assert.equal((await a.call(path)).status, 404, path);
    assert.equal(
      (await a.call("/api/auth/google", { method: "POST", body: {} })).status,
      503,
    );
    const callback = await a.call(
      "/api/auth/google/callback?state=invalid&code=bad",
    );
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.location, "/?auth=google_failed#akun");
  });
  await t.test(
    "database persisten menyimpan progres dan hash setelah dibuka ulang",
    async () => {
      const persisted = await start({ database: file });
      try {
        const user = persisted.db
          .prepare("SELECT id,password_hash FROM users WHERE email=?")
          .get("a@example.test");
        assert.ok(user);
        assert.equal(
          persisted.db
            .prepare("SELECT completed FROM progress WHERE user_id=?")
            .get(user.id).completed,
          1,
        );
      } finally {
        await close(persisted.server);
      }
      const bytes = await readFile(file);
      assert.equal(bytes.subarray(0, 15).toString(), "SQLite format 3");
    },
  );
});
test("rate limiting login aktif pada konfigurasi default", async () => {
  const app = await start({ limitMultiplier: 1 });
  try {
    const c = new Client(app.port);
    await c.start();
    for (let i = 0; i < 8; i++)
      assert.equal(
        (
          await c.call("/api/auth/login", {
            method: "POST",
            body: { email: "nobody@example.test", password: pass },
          })
        ).status,
        401,
      );
    const r = await c.call("/api/auth/login", {
      method: "POST",
      body: { email: "nobody@example.test", password: pass },
    });
    assert.equal(r.status, 429);
    assert.ok(r.headers["retry-after"]);
  } finally {
    await close(app.server);
  }
});
test("Google memakai state, nonce, PKCE dan redirect tetap", async () => {
  const app = await start({
    googleId: "test-client.apps.googleusercontent.com",
    googleSecret: "not-a-real-client-secret",
  });
  try {
    const c = new Client(app.port);
    await c.start();
    const r = await c.call("/api/auth/google", { method: "POST", body: {} });
    assert.equal(r.status, 200);
    const url = new URL(r.data.url);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      `${origin}/api/auth/google/callback`,
    );
    assert.ok(url.searchParams.get("state"));
    assert.ok(url.searchParams.get("nonce"));
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    const cancel = await c.call(
      "/api/auth/google/callback?error=access_denied&state=" +
        url.searchParams.get("state"),
    );
    assert.equal(cancel.status, 303);
    assert.equal(
      app.db.prepare("SELECT count(*) AS n FROM oauth_states").get().n,
      0,
    );
  } finally {
    await close(app.server);
  }
});
test("production menolak HTTP dan memakai cookie Secure", async () => {
  assert.throws(
    () => createApp({ production: true, origin, database: ":memory:" }),
    /HTTPS/,
  );
  const app = await start({
    production: true,
    origin: "https://localhost:3000",
  });
  try {
    const c = new Client(app.port);
    const r = await c.start();
    assert.match(r.headers["set-cookie"][0], /__Host-loka_session=/);
    assert.match(r.headers["set-cookie"][0], /; Secure/);
    assert.match(r.headers["strict-transport-security"], /max-age/);
  } finally {
    await close(app.server);
  }
});
test("versi statis menyajikan UI dan tidak memiliki endpoint akun", async () => {
  const server = createStaticServer();

  try {
    const c = new Client(server);
    assert.equal((await c.call("/index.html")).status, 200);
    assert.match((await c.call("/runtime.js")).text, /mode:["']static["']/);
    assert.equal(
      (await c.call("/api/auth/register", { method: "POST", body: {} })).status,
      405,
    );
    assert.equal((await c.call("/api/session")).status, 404);
  } finally {
    await close(server);
  }
});
