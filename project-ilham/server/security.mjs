import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
let hashing = 0;
export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const digest = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function passwordHash(password, salt = token(16)) {
  // OWASP scrypt profile N=2^17, r=8, p=1. Bound concurrent memory work.
  if (hashing >= 2)
    throw new HttpError(
      503,
      "Server sedang sibuk. Coba kembali sebentar lagi.",
    );
  hashing++;
  try {
    const hash = await derive(password, salt, 64, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 160 * 1024 * 1024,
    });
    return `scrypt$131072$8$1$${salt}$${hash.toString("hex")}`;
  } finally {
    hashing--;
  }
}
export async function passwordMatches(password, stored) {
  const parts = (stored || "").split("$");
  // Dummy work prevents the fast user-not-found branch from revealing accounts.
  const salt = parts.length === 6 ? parts[4] : "lokanaik-public-timing-padding";
  const calculated = await passwordHash(password, salt);
  return !!stored && equal(calculated, stored);
}
export function string(value, label, min = 1, max = 200) {
  if (typeof value !== "string")
    throw new HttpError(400, `${label} tidak valid.`);
  const clean = value.trim();
  if (
    clean.length < min ||
    clean.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(clean)
  ) {
    throw new HttpError(400, `${label} harus berisi ${min}–${max} karakter.`);
  }
  return clean;
}
export function email(value) {
  const text = string(value, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text))
    throw new HttpError(400, "Masukkan alamat email yang valid.");
  return text;
}
export function password(value) {
  if (typeof value !== "string" || value.length < 15 || value.length > 128)
    throw new HttpError(400, "Gunakan kata sandi sepanjang 15–128 karakter.");
  // Spaces and Unicode are allowed. No silent trimming or truncation.
  if (new Set(value).size < 5)
    throw new HttpError(400, "Gunakan kata sandi yang lebih sulit ditebak.");
  return value;
}
export function cookieValue(req, name) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}
export async function readJSON(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || ""))
    throw new HttpError(415, "Gunakan Content-Type application/json.");
  if (Number(req.headers["content-length"]) > 16384)
    throw new HttpError(413, "Data terlalu besar.");
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16384) throw new HttpError(413, "Data terlalu besar.");
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("object expected");
    return data;
  } catch {
    throw new HttpError(400, "Format data tidak valid.");
  }
}
export function headers(res, production) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'",
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (production)
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
}
