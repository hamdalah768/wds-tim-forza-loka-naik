import { createHmac } from 'node:crypto';

export function createSocial(c) {
  const { db, origin, options, token, digest, equal, rate, json, redirect, newSession, publicUser, readJSON, string, email, HttpError } = c;
  const env = options.socialEnv || process.env;
  const fbId = env.FACEBOOK_APP_ID || '', fbSecret = env.FACEBOOK_APP_SECRET || '', version = env.FACEBOOK_GRAPH_VERSION || '';
  const sid = env.TWILIO_ACCOUNT_SID || '', secret = env.TWILIO_AUTH_TOKEN || '', service = env.TWILIO_VERIFY_SERVICE_SID || '';
  const enabled = { facebook: !!(fbId && fbSecret && /^v\d+\.\d+$/.test(version)), phone: !!(/^AC[a-f0-9]{32}$/i.test(sid) && secret && /^VA[a-f0-9]{32}$/i.test(service)) };
  const network = options.socialFetch || fetch;
  async function remote(url, init = {}) {
    const r = await network(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new HttpError(502, 'Layanan masuk belum merespons. Coba kembali.');
    return r.json();
  }
  const requireProvider = name => { if (!enabled[name]) throw new HttpError(503, 'Metode masuk ini belum diaktifkan oleh pengelola. Gunakan email.'); };
  async function twilio(path, values) {
    return remote(`https://verify.twilio.com/v2/Services/${service}/${path}`, { method: 'POST', headers: { Authorization: 'Basic '+Buffer.from(sid+':'+secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values) });
  }
  async function callback(req, res, url, session) {
    const state = url.searchParams.get('state') || '';
    const row = db.prepare('SELECT * FROM oauth_states WHERE state_hash=?').get(digest(state));
    if (row) db.prepare('DELETE FROM oauth_states WHERE state_hash=?').run(digest(state));
    const fail = () => redirect(res, '/?auth=facebook_failed#akun');
    if (!enabled.facebook || !row || row.provider !== 'facebook' || row.expires_at <= Date.now() || !session || !equal(row.session_hash, session.token_hash) || url.searchParams.has('error')) return fail();
    const code = url.searchParams.get('code');
    if (!code || code.length > 4096) return fail();
    try {
      const endpoint = `https://graph.facebook.com/${version}`;
      const tokens = await remote(endpoint+'/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: fbId, client_secret: fbSecret, redirect_uri: origin+'/api/auth/facebook/callback', code }) });
      if (typeof tokens.access_token !== 'string') throw Error('Invalid token');
      const checkUrl = new URL(endpoint+'/debug_token'); checkUrl.searchParams.set('input_token', tokens.access_token);
      const checked = (await remote(checkUrl, { headers: { Authorization: 'Bearer '+fbId+'|'+fbSecret } })).data;
      if (!checked?.is_valid || String(checked.app_id) !== fbId || typeof checked.user_id !== 'string' || !Number.isFinite(checked.expires_at) || checked.expires_at <= Date.now()/1000) throw Error('Invalid identity');
      if (checked.data_access_expires_at && checked.data_access_expires_at <= Date.now()/1000) throw Error('Expired consent');
      const meUrl = new URL(endpoint+'/me');
      meUrl.searchParams.set('fields', 'id,name,email');
      meUrl.searchParams.set('appsecret_proof', createHmac('sha256', fbSecret).update(tokens.access_token).digest('hex'));
      const me = await remote(meUrl, { headers: { Authorization: 'Bearer '+tokens.access_token } });
      if (!equal(me.id, checked.user_id)) throw Error('Invalid subject');
      let user = db.prepare('SELECT id FROM users WHERE facebook_sub=?').get(me.id);
      if (!user) {
        const address = me.email ? email(me.email) : null;
        if (address && db.prepare('SELECT id FROM users WHERE email=?').get(address)) return redirect(res, '/?auth=use_existing#akun');
        user = { id: token(16) };
        db.prepare('INSERT INTO users(id,email,name,facebook_sub,created_at) VALUES(?,?,?,?,?)').run(user.id, address, string(me.name || 'Pengguna LokaNaik', 'Nama', 1, 80), me.id, Date.now());
      }
      newSession(res, user.id, session);
      return redirect(res, '/#akun');
    } catch { return fail(); }
  }
  async function handle(req, res, path, session, ip) {
    if (req.method !== 'POST') return false;
    if (path === '/api/auth/facebook') {
      requireProvider('facebook'); rate('fb:'+ip, 10);
      const state = token();
      db.prepare('INSERT INTO oauth_states(state_hash,session_hash,verifier,nonce,expires_at,provider) VALUES(?,?,?,?,?,?)').run(digest(state),session.token_hash,'','',Date.now()+300000,'facebook');
      const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
      url.search = new URLSearchParams({ client_id: fbId, redirect_uri: origin+'/api/auth/facebook/callback', response_type: 'code', scope: 'public_profile,email', state }).toString();
      json(res, 200, { url: url.href }); return true;
    }
    if (path === '/api/auth/phone/send') {
      requireProvider('phone'); rate('sms-ip:'+ip, 5, 1800000);
      const body = await readJSON(req); let phone = string(body.phone,'Nomor HP',8,18).replace(/[\s-]/g,'');
      if (phone.startsWith('0')) phone = '+62'+phone.slice(1);
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new HttpError(400,'Gunakan nomor HP lengkap, misalnya +62812…');
      rate('sms-phone:'+phone, 3, 1800000);
      const response = await twilio('Verifications', { To: phone, Channel: 'sms' });
      if (response.status !== 'pending') throw new HttpError(502,'Kode belum terkirim. Coba kembali nanti.');
      db.prepare('INSERT INTO phone_challenges(session_hash,phone,expires_at) VALUES(?,?,?) ON CONFLICT(session_hash) DO UPDATE SET phone=excluded.phone,expires_at=excluded.expires_at').run(session.token_hash,phone,Date.now()+600000);
      json(res,200,{ sent:true, masked:phone.slice(0,3)+'••••'+phone.slice(-4) }); return true;
    }
    if (path === '/api/auth/phone/check') {
      requireProvider('phone'); rate('sms-check:'+ip, 12); rate('sms-session:'+session.token_hash,5);
      const { code } = await readJSON(req);
      if (typeof code !== 'string' || !/^\d{4,10}$/.test(code)) throw new HttpError(400,'Masukkan kode SMS yang valid.');
      const challenge = db.prepare('SELECT * FROM phone_challenges WHERE session_hash=?').get(session.token_hash);
      if (!challenge || challenge.expires_at <= Date.now()) throw new HttpError(400,'Kode kedaluwarsa. Minta kode baru.');
      const result = await twilio('VerificationCheck', { To:challenge.phone, Code:code });
      if (result.status !== 'approved') throw new HttpError(400,'Kode tidak cocok atau telah kedaluwarsa.');
      // Consume the challenge before creating any session. Concurrent/replayed checks fail.
      const used = db.prepare('DELETE FROM phone_challenges WHERE session_hash=? AND phone=?').run(session.token_hash,challenge.phone);
      if (!used.changes) throw new HttpError(400,'Kode sudah digunakan.');
      let user = db.prepare('SELECT id FROM users WHERE phone=?').get(challenge.phone);
      if (!user) { user={id:token(16)}; db.prepare('INSERT INTO users(id,name,phone,created_at) VALUES(?,?,?,?)').run(user.id,'Pengguna LokaNaik',challenge.phone,Date.now()); }
      const fresh = newSession(res,user.id,session);
      json(res,200,{ user:publicUser(user.id),csrf:fresh.csrf }); return true;
    }
    return false;
  }
  return { enabled, callback, handle };
}
