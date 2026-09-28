/**
 * Yi-Num · 自建邮箱验证码 + 登录态签发（Cloudflare Function）
 *
 * 设计要点（避免引入 KV/D1）：
 *  - 发送验证码时，服务端生成一个 6 位码，并用 HS256 签发一个「challenge」
 *    令牌（payload 内只放 code 的 HMAC，绝不包含验证码明文），返回给前端暂存；
 *  - 校验时前端把 {email, code, challenge} 一起提交，服务端验签后核对 code 的 HMAC，
 *    通过后签发正式会话 JWT（sub=email）。
 *  - 账号以 email 归一（邮箱登录与 Google 登录同一邮箱 ⇒ 同一账号，即“关联”）。
 *
 * 需要在 Cloudflare 项目环境变量/Secrets 中配置：
 *   JWT_SECRET            服务端签名密钥（任意长随机串，务必保密）
 *   RESEND_API_KEY        Resend 发送邮件用的 API Key
 *   RESEND_FROM           发件地址（需为 Resend 已验证域名下的地址，如 no-reply@yinum.com）
 *   FIREBASE_PROJECT_ID   Firebase 项目 ID（用于校验 Google 登录得到的 Firebase idToken）
 * 可选：
 *   ALLOWED_ORIGIN       仅允许指定来源调用（如 https://yinum.com）
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const CODE_TTL = 10 * 60; // 验证码有效期（秒）

/* ----------------------- 编码工具 ----------------------- */
function strToU8(s) { return new TextEncoder().encode(s); }
function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToStr(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return new TextDecoder().decode(Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }));
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ----------------------- HMAC / JWT ----------------------- */
function getHmacKey(secret) {
  return crypto.subtle.importKey('raw', strToU8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function hmac(secret, data) {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, strToU8(data));
  return bytesToB64url(new Uint8Array(sig));
}
async function hmacVerify(secret, data, sigB64) {
  const key = await getHmacKey(secret);
  return crypto.subtle.verify('HMAC', key, b64urlToBytes(sigB64), strToU8(data));
}
async function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = bytesToB64url(strToU8(JSON.stringify(header)));
  const p = bytesToB64url(strToU8(JSON.stringify(payload)));
  const sig = await hmac(secret, h + '.' + p);
  return h + '.' + p + '.' + sig;
}
async function verifyHS256(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const ok = await hmacVerify(secret, parts[0] + '.' + parts[1], parts[2]);
  if (!ok) return null;
  try { return JSON.parse(b64urlToStr(parts[1])); } catch (e) { return null; }
}

/* ----------------------- 邮件发送（Resend） ----------------------- */
async function sendCodeEmail(to, code, env) {
  if (!env.RESEND_API_KEY) return false; // 未配置：交给上层返回 devCode 供测试
  const from = env.RESEND_FROM || 'Yi-Num <onboarding@resend.dev>';
  const r = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.RESEND_API_KEY
    },
    body: JSON.stringify({
      from: from,
      to: [to],
      subject: 'Yi-Num 登录验证码',
      html: '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">' +
        '<h2>Yi-Num 登录验证码</h2>' +
        '<p>您的验证码为：<b style="font-size:22px;letter-spacing:2px">' + code + '</b></p>' +
        '<p>验证码 10 分钟内有效。若非本人操作，请忽略本邮件。</p>' +
        '</div>'
    })
  });
  return r.ok;
}

/* ----------------------- Firebase idToken 校验（RS256） ----------------------- */
let _certCache = { ts: 0, map: null };
async function getGoogleCerts() {
  const now = Date.now();
  if (_certCache.map && now - _certCache.ts < 60 * 60 * 1000) return _certCache.map;
  const r = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  const map = await r.json();
  _certCache = { ts: now, map: map };
  return map;
}
function pemToDer(pem) {
  const b64 = String(pem)
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('bad_token');
  const header = JSON.parse(b64urlToStr(parts[0]));
  const payload = JSON.parse(b64urlToStr(parts[1]));
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('expired');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('bad_iss');
  if (payload.aud !== projectId) throw new Error('bad_aud');
  const certs = await getGoogleCerts();
  const pem = certs[header.kid];
  if (!pem) throw new Error('unknown_kid');
  const key = await crypto.subtle.importKey('spki', pemToDer(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const sig = b64urlToBytes(parts[2]);
  const data = strToU8(parts[0] + '.' + parts[1]);
  const ok = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sig, data);
  if (!ok) throw new Error('bad_sig');
  if (!payload.email) throw new Error('no_email');
  return payload;
}

/* ----------------------- 会话令牌 ----------------------- */
function issueSession(email, secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: email,
    email: email,
    iat: now,
    exp: now + 60 * 60 * 24 * 30
  };
  return signHS256(payload, secret);
}

/* ----------------------- 响应工具 ----------------------- */
function corsHeaders(allowed) {
  return {
    'Access-Control-Allow-Origin': allowed || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
function json(obj, status, allowed) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: corsHeaders(allowed) });
}
function readBody(request) {
  return request.json().catch(function () { return {}; });
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

/* ----------------------- 主处理逻辑 ----------------------- */
export async function onRequestPost({ request, env }) {
  const allowed = env.ALLOWED_ORIGIN;
  const origin = request.headers.get('origin');
  if (allowed && origin && origin !== allowed) return json({ error: 'forbidden_origin' }, 403, allowed);

  const secret = env.JWT_SECRET;
  if (!secret) return json({ error: 'server_not_configured' }, 500, allowed);

  const body = await readBody(request);
  const action = body.action || (body.code ? 'verify-code' : 'send-code');

  try {
    /* ---- 发送验证码 ---- */
    if (action === 'send-code') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) return json({ error: 'invalid_email' }, 400, allowed);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await hmac(secret, 'code:' + code + ':' + email);
      const challenge = await signHS256(
        { email: email, codeHash: codeHash, exp: Math.floor(Date.now() / 1000) + CODE_TTL },
        secret
      );

      const sent = await sendCodeEmail(email, code, env);
      const res = { ok: true, challenge: challenge };
      if (!sent) res.devCode = code; // 未配置 Resend 时回显，便于本地/预发测试
      return json(res, 200, allowed);
    }

    /* ---- 校验验证码 ---- */
    if (action === 'verify-code') {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const challenge = body.challenge;
      if (!isValidEmail(email) || !/^\d{6}$/.test(code) || !challenge) {
        return json({ error: 'bad_request' }, 400, allowed);
      }
      const payload = await verifyHS256(challenge, secret);
      if (!payload || payload.exp * 1000 < Date.now()) return json({ error: 'expired' }, 401, allowed);
      if (payload.email !== email) return json({ error: 'mismatch' }, 401, allowed);
      const codeHash = await hmac(secret, 'code:' + code + ':' + email);
      if (codeHash !== payload.codeHash) return json({ error: 'code_invalid' }, 401, allowed);

      const token = await issueSession(email, secret);
      return json({ token: token, user: { email: email } }, 200, allowed);
    }

    /* ---- Google 登录（校验 Firebase idToken 后签发会话） ---- */
    if (action === 'google') {
      const idToken = body.idToken;
      if (!idToken) return json({ error: 'bad_request' }, 400, allowed);
      const payload = await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID || 'yi-num');
      const token = await issueSession(payload.email, secret);
      return json({ token: token, user: { email: payload.email } }, 200, allowed);
    }

    return json({ error: 'unknown_action' }, 400, allowed);
  } catch (e) {
    const msg = (e && e.message) || String(e);
    if (msg === 'expired' || msg === 'bad_iss' || msg === 'bad_aud' || msg === 'bad_sig' || msg === 'unknown_kid') {
      return json({ error: 'google_token_invalid' }, 401, allowed);
    }
    return json({ error: 'server_error', message: msg }, 500, allowed);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env.ALLOWED_ORIGIN) });
}
