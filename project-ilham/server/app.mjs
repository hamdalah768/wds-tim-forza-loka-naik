import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { googleIdentity } from "./google-identity.mjs";
import { createSocial } from "./social.mjs";
import { openDatabase, transaction } from "./database.mjs";
import { content, searchLessons } from "./content.mjs";
import {
  token,
  digest,
  equal,
  HttpError,
  string,
  email,
  password,
  passwordHash,
  passwordMatches,
  cookieValue,
  readJSON,
  headers,
} from "./security.mjs";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const pages = new Set([
  "index.html",
  "belajar.html",
  "materi.html",
  "studio.html",
  "cerita.html",
  "pencarian.html",
  "akun.html",
]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
const ttl = 30 * 60 * 1000;
export function createApp(options = {}) {
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  const origin = new URL(
    options.origin || process.env.APP_ORIGIN || "http://localhost:3000",
  ).origin;
  if (production && !origin.startsWith("https://"))
    throw new Error("Production membutuhkan APP_ORIGIN dengan HTTPS.");
  const db = openDatabase(
    options.database ||
      process.env.DATABASE_PATH ||
      fileURLToPath(new URL("../data/lokanaik.sqlite", import.meta.url)),
  );
  const googleId = options.googleId ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const googleSecret =
    options.googleSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!!googleId !== !!googleSecret)
    throw new Error(
      "GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET harus diisi bersama.",
    );
  const google = !!(googleId && googleSecret);
  const cookieName = production ? "__Host-loka_session" : "loka_session";
  const limitMultiplier = options.limitMultiplier || 1;
  const now = () => Date.now();
  function json(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  function redirect(res, path) {
    res.writeHead(303, { Location: path, "Cache-Control": "no-store" });
    res.end();
  }
  function rate(bucket, max, duration = 10 * 60 * 1000) {
    const key = digest(bucket),
      current = now();
    const row = db
      .prepare("SELECT count,expires_at FROM rate_limits WHERE bucket=?")
      .get(key);
    if (row && row.expires_at > current && row.count >= max * limitMultiplier) {
      const seconds = Math.ceil((row.expires_at - current) / 1000);
      const error = new HttpError(
        429,
        `Terlalu banyak percobaan. Coba kembali sekitar ${Math.ceil(seconds / 60)} menit lagi.`,
      );
      error.retryAfter = seconds;
      throw error;
    }
    if (!row || row.expires_at <= current)
      db.prepare(
        "INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=1,expires_at=excluded.expires_at",
      ).run(key, current + duration);
    else
      db.prepare("UPDATE rate_limits SET count=count+1 WHERE bucket=?").run(
        key,
      );
  }
  function setSessionCookie(res, raw, age = 43200) {
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${raw}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${age}${production ? "; Secure" : ""}`,
    );
  }
  function getSession(req) {
    const raw = cookieValue(req, cookieName);
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const session = db
      .prepare("SELECT * FROM sessions WHERE token_hash=?")
      .get(digest(raw));
    if (!session || session.expires_at < now() || session.absolute_at < now())
      return null;
    if (now() - session.touched_at > 60000)
      db.prepare(
        "UPDATE sessions SET touched_at=?,expires_at=? WHERE token_hash=?",
      ).run(
        now(),
        Math.min(now() + ttl, session.absolute_at),
        session.token_hash,
      );
    return session;
  }
  function newSession(res, userId = null, previous = null) {
    const raw = token(),
      csrf = token(),
      hash = digest(raw),
      current = now();
    transaction(db, () => {
      if (previous)
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          previous.token_hash,
        );
      db.prepare(
        "INSERT INTO sessions(token_hash,user_id,csrf,expires_at,absolute_at,touched_at) VALUES(?,?,?,?,?,?)",
      ).run(
        hash,
        userId,
        csrf,
        current + ttl,
        current + 12 * 60 * 60 * 1000,
        current,
      );
    });
    setSessionCookie(res, raw);
    return { token_hash: hash, user_id: userId, csrf };
  }
  function publicUser(userId) {
    if (!userId) return null;
    const user = db
      .prepare(
        "SELECT id,name,email,phone,facebook_sub,google_sub,email_verified,password_hash,created_at FROM users WHERE id=?",
      )
      .get(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: !!user.email_verified,
      provider: user.password_hash ? "password" : user.phone ? "phone" : user.facebook_sub ? "facebook" : "google",
      phone: user.phone,
      createdAt: user.created_at,
    };
  }
  function authenticated(session) {
    if (!session?.user_id || !publicUser(session.user_id))
      throw new HttpError(401, "Masuk ke akun untuk melanjutkan.");
    return session.user_id;
  }
  function csrfCheck(req, session) {
    if (
      req.headers.origin !== origin ||
      !session ||
      !equal(req.headers["x-csrf-token"], session.csrf)
    )
      throw new HttpError(
        403,
        "Sesi keamanan tidak valid. Muat ulang halaman lalu coba kembali.",
      );
    if (
      req.headers["sec-fetch-site"] &&
      !["same-origin", "none"].includes(req.headers["sec-fetch-site"])
    )
      throw new HttpError(403, "Permintaan lintas situs ditolak.");
  }
  function draftInput(body) {
    const value = {
      title: string(body.title, "Nama produk", 2, 80),
      category: string(body.category, "Kategori", 2, 40),
      description: string(body.description, "Deskripsi", 10, 600),
      size: string(body.size, "Ukuran / berat", 1, 60),
      image: string(body.image, "Gambar", 1, 40),
    };
    if (
      !["Makanan lokal", "Kerajinan", "Tekstil", "Produk lainnya"].includes(
        value.category,
      )
    )
      throw new HttpError(400, "Kategori produk tidak valid.");
    if (
      ![
        "banana.webp",
        "jar-after.webp",
        "mug.webp",
        "woven.webp",
        "batik.webp",
      ].includes(value.image)
    )
      throw new HttpError(400, "Pilih gambar yang tersedia.");
    return value;
  }
  async function googleCallback(req, res, url, session) {
    const state = url.searchParams.get("state") || "";
    const row = db
      .prepare("SELECT * FROM oauth_states WHERE state_hash=?")
      .get(digest(state));
    if (row)
      db.prepare("DELETE FROM oauth_states WHERE state_hash=?").run(
        digest(state),
      );
    if (
      !google ||
      !row ||
      row.provider !== "google" ||
      row.expires_at < now() ||
      !session ||
      !equal(row.session_hash, session.token_hash) ||
      url.searchParams.has("error")
    )
      return redirect(res, "/?auth=google_failed#akun");
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096)
      return redirect(res, "/?auth=google_failed#akun");
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleId,
          client_secret: googleSecret,
          redirect_uri: `${origin}/api/auth/google/callback`,
          grant_type: "authorization_code",
          code_verifier: row.verifier,
        }),
      });
      if (!response.ok) throw new Error("oauth token exchange failed");
      const tokens = await response.json();
      const payload = await googleIdentity(tokens.id_token, googleId, row.nonce);
      if (
        !equal(payload.nonce, row.nonce) ||
        payload.email_verified !== true ||
        typeof payload.sub !== "string" ||
        payload.sub.length < 1 || payload.sub.length > 255
      )
        throw new Error("invalid identity");
      const address = email(payload.email);
      let user = db
        .prepare("SELECT id FROM users WHERE google_sub=?")
        .get(payload.sub);
      if (!user) {
        // No automatic email linking: local email ownership has not been verified.
        if (db.prepare("SELECT id FROM users WHERE email=?").get(address))
          return redirect(res, "/?auth=use_password#akun");
        user = { id: token(16) };
        db.prepare(
          "INSERT INTO users(id,email,name,google_sub,email_verified,created_at) VALUES(?,?,?,?,1,?)",
        ).run(
          user.id,
          address,
          string(payload.name || "Teman Loka", "Nama", 1, 80),
          payload.sub,
          now(),
        );
      }
      newSession(res, user.id, session);
      // Access, refresh and ID tokens are never stored or sent to the browser.
      return redirect(res, "/#akun");
    } catch {
      return redirect(res, "/?auth=google_failed#akun");
    }
  }
  async function api(req, res, url) {
    const path = url.pathname,
      method = req.method,
      ip = req.socket.remoteAddress || "unknown";
    if (req.headers.host !== new URL(origin).host)
      throw new HttpError(403, "Alamat server tidak sesuai APP_ORIGIN.");
    if (req.headers.origin && req.headers.origin !== origin)
      throw new HttpError(403, "Asal permintaan ditolak.");
    rate(`api:${ip}`, 1800);
    let session = getSession(req);
    if (path === "/api/auth/facebook/callback" && method === "GET") return social.callback(req, res, url, session);
    if (path === "/api/auth/google/callback" && method === "GET")
      return googleCallback(req, res, url, session);
    if (method === "GET" && path === "/api/session") {
      if (!session) {
        rate(`session:${ip}`, 60);
        session = newSession(res);
      }
      return json(res, 200, {
        user: publicUser(session.user_id),
        csrf: session.csrf,
        google,
        providers: { google, ...social.enabled },
      });
    }
    if (method === "GET" && path === "/api/health")
      return json(res, 200, { ok: true });
    if (method === "GET" && path === "/api/search") {
      const q = string(url.searchParams.get("q") || "", "Pencarian", 0, 100),
        category = url.searchParams.get("kategori") || "Semua",
        sort = url.searchParams.get("urut") || "relevansi";
      if (
        !content.categories.includes(category) ||
        !["relevansi", "durasi"].includes(sort)
      )
        throw new HttpError(400, "Filter pencarian tidak valid.");
      const lessons = searchLessons(q, category, sort);
      return json(res, 200, { total: lessons.length, lessons });
    }
    if (!["GET", "POST", "PUT", "DELETE"].includes(method))
      throw new HttpError(405, "Metode tidak didukung.");
    if (["POST", "PUT", "DELETE"].includes(method)) csrfCheck(req, session);
    if (method === "POST" && path === "/api/auth/register") {
      rate(`auth-ip:${ip}`, 12);
      const body = await readJSON(req),
        address = email(body.email),
        name = string(body.name, "Nama", 2, 80),
        pass = password(body.password);
      rate(`register:${address}`, 4, 60 * 60 * 1000);
      const hash = await passwordHash(pass);
      if (db.prepare("SELECT id FROM users WHERE email=?").get(address))
        throw new HttpError(
          400,
          "Pendaftaran tidak dapat diproses. Coba masuk atau gunakan alamat email lain.",
        );
      const id = token(16),
        recoveryCode = token(24);
      db.prepare(
        "INSERT INTO users(id,email,name,password_hash,recovery_hash,created_at) VALUES(?,?,?,?,?,?)",
      ).run(id, address, name, hash, digest(recoveryCode), now());
      const fresh = newSession(res, id, session);
      return json(res, 201, {
        user: publicUser(id),
        csrf: fresh.csrf,
        recoveryCode,
      });
    }
    if (method === "POST" && path === "/api/auth/login") {
      rate(`auth-ip:${ip}`, 12);
      const body = await readJSON(req),
        address = email(body.email);
      string(body.password, "Kata sandi", 1, 128);
      rate(`login:${address}`, 8);
      // The original password is used, including intentional leading/trailing spaces.
      const user = db
        .prepare("SELECT id,password_hash FROM users WHERE email=?")
        .get(address);
      if (!(await passwordMatches(body.password, user?.password_hash)))
        throw new HttpError(401, "Email atau kata sandi tidak cocok.");
      const fresh = newSession(res, user.id, session);
      return json(res, 200, { user: publicUser(user.id), csrf: fresh.csrf });
    }
    if (method === "POST" && path === "/api/auth/logout") {
      if (session)
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          session.token_hash,
        );
      setSessionCookie(res, "", 0);
      return json(res, 200, { ok: true });
    }
    if (method === "POST" && path === "/api/auth/recover") {
      rate(`auth-ip:${ip}`, 12);
      const body = await readJSON(req),
        address = email(body.email),
        code = string(body.recoveryCode, "Kode pemulihan", 20, 100),
        pass = password(body.password);
      rate(`recover:${address}`, 5, 60 * 60 * 1000);
      const user = db
        .prepare("SELECT id,recovery_hash FROM users WHERE email=?")
        .get(address);
      if (
        !equal(digest(code), user?.recovery_hash || digest("invalid recovery"))
      )
        throw new HttpError(400, "Email atau kode pemulihan tidak cocok.");
      const hash = await passwordHash(pass),
        recoveryCode = token(24);
      transaction(db, () => {
        const changed = db.prepare(
          "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?",
        ).run(hash, digest(recoveryCode), user.id, user.recovery_hash);
        if (!changed.changes) throw new HttpError(400, "Kode pemulihan sudah digunakan.");
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      });
      const fresh = newSession(res, user.id, session);
      return json(res, 200, {
        user: publicUser(user.id),
        csrf: fresh.csrf,
        recoveryCode,
      });
    }
    if (method === "POST" && path === "/api/auth/google") {
      if (!google)
        throw new HttpError(
          503,
          "Login Google belum dihubungkan oleh pemilik website.",
        );
      rate(`google:${ip}`, 10);
      const state = token(),
        verifier = token(48),
        nonce = token();
      db.prepare(
        "INSERT INTO oauth_states(state_hash,session_hash,verifier,nonce,expires_at) VALUES(?,?,?,?,?)",
      ).run(
        digest(state),
        session.token_hash,
        verifier,
        nonce,
        now() + 5 * 60 * 1000,
      );
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.search = new URLSearchParams({
        client_id: googleId,
        redirect_uri: `${origin}/api/auth/google/callback`,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: Buffer.from(digest(verifier), "hex").toString(
          "base64url",
        ),
        code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      return json(res, 200, { url: auth.href });
    }
    if (await social.handle(req, res, path, session, ip)) return;
    if (path === '/api/quiz' && method === 'POST') {
      const body = await readJSON(req), lesson = content.lessons.find(l => l.slug === body.lesson);
      if (!lesson || !Number.isInteger(body.answer) || body.answer < 0 || body.answer >= lesson.answers.length) throw new HttpError(400, 'Jawaban tidak valid.');
      const correct = body.answer === lesson.correct;
      if (session.user_id) db.prepare('INSERT INTO quizzes(user_id,lesson,correct,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,lesson) DO UPDATE SET correct=excluded.correct,updated_at=excluded.updated_at').run(session.user_id, lesson.slug, Number(correct), now());
      return json(res, 200, { correct, explanation: lesson.explanation, saved: !!session.user_id });
    }
    const userId = authenticated(session);
    if (path === '/api/account/sessions' && method === 'GET') return json(res, 200, { sessions: db.prepare('SELECT token_hash,touched_at,absolute_at FROM sessions WHERE user_id=? AND expires_at>?').all(userId, now()).map(s => ({ current: s.token_hash === session.token_hash, lastActive: s.touched_at, expiresAt: s.absolute_at })) });
    if (path === '/api/account/logout-others' && method === 'POST') {
      db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(userId, session.token_hash);
      return json(res, 200, { ok: true });
    }
    if (path === "/api/profile" && method === "PUT") {
      const body = await readJSON(req),
        name = string(body.name, "Nama", 2, 80);
      db.prepare("UPDATE users SET name=? WHERE id=?").run(name, userId);
      return json(res, 200, { user: publicUser(userId) });
    }
    if (path === "/api/auth/password" && method === "POST") {
      rate(`password:${userId}`, 5, 60 * 60 * 1000);
      const body = await readJSON(req),
        pass = password(body.password);
      string(body.currentPassword, "Kata sandi saat ini", 1, 128);
      const user = db
        .prepare("SELECT password_hash FROM users WHERE id=?")
        .get(userId);
      if (
        !user.password_hash ||
        !(await passwordMatches(body.currentPassword, user.password_hash))
      )
        throw new HttpError(400, "Kata sandi saat ini tidak cocok.");
      const hash = await passwordHash(pass),
        recoveryCode = token(24);
      transaction(db, () => {
        db.prepare(
          "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=?",
        ).run(hash, digest(recoveryCode), userId);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
      });
      const fresh = newSession(res, userId);
      return json(res, 200, { ok: true, csrf: fresh.csrf, recoveryCode });
    }
    if (path === "/api/progress" && method === "GET") {
      const rows = db
        .prepare(
          "SELECT lesson,tasks,completed,updated_at FROM progress WHERE user_id=?",
        )
        .all(userId);
      return json(res, 200, {
        progress: rows.map((row) => ({
          ...row,
          tasks: JSON.parse(row.tasks),
          completed: !!row.completed,
        })),
      });
    }
    if (path === "/api/progress" && method === "PUT") {
      const body = await readJSON(req),
        lesson = content.lessons.find((x) => x.slug === body.lesson);
      if (
        !lesson ||
        !Array.isArray(body.tasks) ||
        body.tasks.length !== lesson.tasks.length ||
        !body.tasks.every((x) => typeof x === "boolean") ||
        typeof body.completed !== "boolean"
      )
        throw new HttpError(400, "Progres latihan tidak valid.");
      if (
        body.completed &&
        (!body.tasks.every(Boolean) ||
          (lesson.assessment !== "checklist" && body.answer !== lesson.correct))
      )
        throw new HttpError(
          400,
          "Selesaikan latihan dan cek pemahaman terlebih dahulu.",
        );
      db.prepare(
        "INSERT INTO progress(user_id,lesson,tasks,completed,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,lesson) DO UPDATE SET tasks=excluded.tasks,completed=excluded.completed,updated_at=excluded.updated_at",
      ).run(
        userId,
        lesson.slug,
        JSON.stringify(body.tasks),
        Number(body.completed),
        now(),
      );
      return json(res, 200, { ok: true });
    }
    if (path === "/api/drafts" && method === "GET")
      return json(res, 200, {
        quizzes: db.prepare("SELECT lesson,correct,updated_at FROM quizzes WHERE user_id=?").all(userId),
        drafts: db
          .prepare(
            "SELECT id,title,category,description,size,image,updated_at FROM drafts WHERE user_id=? ORDER BY updated_at DESC",
          )
          .all(userId),
      });
    if (path === "/api/drafts" && method === "POST") {
      const body = draftInput(await readJSON(req));
      if (
        db
          .prepare("SELECT count(*) AS total FROM drafts WHERE user_id=?")
          .get(userId).total >= 50
      )
        throw new HttpError(
          400,
          "Maksimal 50 rancangan. Hapus rancangan lama untuk menambah yang baru.",
        );
      const id = token(16);
      db.prepare(
        "INSERT INTO drafts(id,user_id,title,category,description,size,image,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      ).run(
        id,
        userId,
        body.title,
        body.category,
        body.description,
        body.size,
        body.image,
        now(),
      );
      return json(res, 201, { id, ...body });
    }
    const draftMatch = path.match(/^\/api\/drafts\/([A-Za-z0-9_-]{22})$/);
    if (draftMatch && (method === "PUT" || method === "DELETE")) {
      const id = draftMatch[1];
      if (
        !db
          .prepare("SELECT id FROM drafts WHERE id=? AND user_id=?")
          .get(id, userId)
      )
        throw new HttpError(404, "Rancangan tidak ditemukan.");
      if (method === "DELETE")
        db.prepare("DELETE FROM drafts WHERE id=? AND user_id=?").run(
          id,
          userId,
        );
      else {
        const body = draftInput(await readJSON(req));
        db.prepare(
          "UPDATE drafts SET title=?,category=?,description=?,size=?,image=?,updated_at=? WHERE id=? AND user_id=?",
        ).run(
          body.title,
          body.category,
          body.description,
          body.size,
          body.image,
          now(),
          id,
          userId,
        );
      }
      return json(res, 200, { ok: true });
    }
    if (path === "/api/account/export" && method === "GET") {
      return json(res, 200, {
        user: publicUser(userId),
        progress: db
          .prepare(
            "SELECT lesson,tasks,completed,updated_at FROM progress WHERE user_id=?",
          )
          .all(userId),
        quizzes: db.prepare("SELECT lesson,correct,updated_at FROM quizzes WHERE user_id=?").all(userId),
        drafts: db
          .prepare(
            "SELECT id,title,category,description,size,image,updated_at FROM drafts WHERE user_id=?",
          )
          .all(userId),
      });
    }
    throw new HttpError(404, "Alamat API tidak ditemukan.");
  }
  const social = createSocial({ db, origin, production, options, token, digest, equal, rate, json, redirect, newSession, publicUser, readJSON, string, email, HttpError });
  const legacy = { '/belajar.html': 'belajar', '/materi.html': 'bagian-posisi', '/studio.html': 'studio', '/cerita.html': 'cerita', '/pencarian.html': 'pencarian', '/akun.html': 'akun' };
  const server = createServer(async (req, res) => {
    headers(res, production);
    try {
      if (!req.url || req.url.length > 2048)
        throw new HttpError(414, "Alamat terlalu panjang.");
      const url = new URL(req.url, origin);
      if (req.headers.host !== new URL(origin).host) throw new HttpError(403, 'Alamat server tidak sesuai. Gunakan '+origin);
      if (legacy[url.pathname]) {
        const section = url.pathname === '/materi.html' ? (content.lessons.find(l => l.slug === url.searchParams.get('topik'))?.anchor || 'bagian-posisi') : legacy[url.pathname];
        url.searchParams.delete('topik');
        return redirect(res, '/'+url.search+'#'+section);
      }
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (!["GET", "HEAD"].includes(req.method))
        throw new HttpError(405, "Metode tidak didukung.");
      if (url.pathname === "/runtime.js") {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(
          req.method === "HEAD"
            ? ""
            : `window.LOKA_RUNTIME=Object.freeze(${JSON.stringify({ mode: "fullstack", google })});`,
        );
      }
      let path;
      try {
        path =
          decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
      } catch {
        throw new HttpError(400, "Alamat tidak valid.");
      }
      if (
        (!pages.has(path) && !/^assets\/[a-z0-9_./-]+$/i.test(path)) ||
        path.split("/").some((x) => x === ".." || x.startsWith(".")) ||
        !mime[extname(path)]
      )
        throw new HttpError(404, "Halaman tidak ditemukan.");
      const filename = resolve(publicDir, path);
      if (!filename.startsWith(resolve(publicDir) + sep))
        throw new HttpError(404, "Berkas tidak ditemukan.");
      let bytes;
      try {
        bytes = await readFile(filename);
      } catch {
        throw new HttpError(404, "Berkas tidak ditemukan.");
      }
      res.writeHead(200, {
        "Content-Type": mime[extname(path)],
        "Cache-Control":
          extname(path) === ".html" ? "no-cache" : "public, max-age=3600",
        "Content-Length": bytes.length,
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch (error) {
      if (res.headersSent) return res.end();
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 429) res.setHeader("Retry-After", String(error.retryAfter || 600));
      if (status === 500)
        console.error(
          "Kesalahan internal pada permintaan.",
          error.code || error.name || "Error",
        );
      json(res, status, {
        error:
          status === 500
            ? "Terjadi kendala server. Coba kembali."
            : error.message,
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 50;
  const cleanup = setInterval(
    () => {
      try {
        const time = now();
        db.prepare("DELETE FROM sessions WHERE expires_at<?").run(time);
        db.prepare("DELETE FROM rate_limits WHERE expires_at<?").run(time);
        db.prepare("DELETE FROM oauth_states WHERE expires_at<?").run(time);
        db.prepare("DELETE FROM phone_challenges WHERE expires_at<?").run(time);
      } catch {
        /* Database diagnostics are handled at request boundaries. */
      }
    },
    10 * 60 * 1000,
  );
  cleanup.unref();
  server.on("close", () => {
    clearInterval(cleanup);
    db.close();
  });
  return { server, db, origin };
}
