import { createPublicKey, verify } from 'node:crypto';
import { equal } from './security.mjs';

// The issuer and key endpoint are fixed. Token-controlled URLs are never fetched.
let cachedKeys = [], expires = 0, pending;
export function verifyGoogleToken(jwt, keys, audience, nonce, now = Date.now()) {
  if (typeof jwt !== 'string' || jwt.length > 24000) throw Error('Invalid token');
  const pieces = jwt.split('.');
  if (pieces.length !== 3 || pieces.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw Error('Invalid token');
  const head = JSON.parse(Buffer.from(pieces[0], 'base64url'));
  if (head.alg !== 'RS256' || typeof head.kid !== 'string' || head.crit) throw Error('Invalid algorithm');
  const jwk = keys.find(k => k.kid === head.kid && k.kty === 'RSA' && (!k.use || k.use === 'sig') && (!k.alg || k.alg === 'RS256'));
  if (!jwk) throw Error('Unknown key');
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  if (key.asymmetricKeyDetails.modulusLength < 2048 || !verify('RSA-SHA256', Buffer.from(pieces.slice(0, 2).join('.')), key, Buffer.from(pieces[2], 'base64url'))) throw Error('Invalid signature');
  const p = JSON.parse(Buffer.from(pieces[1], 'base64url')), t = Math.floor(now / 1000);
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(p.iss) || !aud.includes(audience) || (aud.length > 1 && p.azp !== audience) || (p.azp && p.azp !== audience)) throw Error('Invalid issuer or audience');
  if (!Number.isFinite(p.exp) || !Number.isFinite(p.iat) || p.exp <= t || p.iat > t + 30 || t - p.iat > 600 || (p.nbf !== undefined && (!Number.isFinite(p.nbf) || p.nbf > t + 30))) throw Error('Expired token');
  if (!equal(p.nonce, nonce) || p.email_verified !== true || typeof p.sub !== 'string' || p.sub.length < 1 || p.sub.length > 255 || typeof p.email !== 'string') throw Error('Invalid identity');
  return p;
}
export async function googleIdentity(jwt, audience, nonce) {
  if (Date.now() >= expires) {
    if (!pending) pending = (async () => {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(6000), redirect: 'error' });
      if (!r.ok) throw Error('Key service unavailable');
      const j = await r.json();
      if (!Array.isArray(j.keys) || j.keys.length > 20) throw Error('Invalid keys');
      cachedKeys = j.keys; expires = Date.now() + 5 * 60 * 1000;
    })().finally(() => { pending = null; });
    await pending;
  }
  return verifyGoogleToken(jwt, cachedKeys, audience, nonce);
}
