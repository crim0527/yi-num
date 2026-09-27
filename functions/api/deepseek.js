/**
 * Yi-Num · DeepSeek 代理（Cloudflare Pages Function）
 *
 * 浏览器不再持有任何 API Key；Key 仅保存在 Cloudflare Pages 项目的
 * 环境变量 / Secrets 中，由本函数代为转发到 api.deepseek.com。
 *
 * 部署前在 Cloudflare Pages 项目（Settings → Environment variables）中添加：
 *   DEEPSEEK_API_KEY         命数页 / 通用兜底
 *   DEEPSEEK_API_KEY_LUCKY   吉时页
 *   DEEPSEEK_API_KEY_ZIWEI   紫微斗数页
 * 可选：
 *   ALLOWED_ORIGIN          仅允许指定域名调用（如 https://yoursite.com）；不设置则允许全部
 *
 * 前端通过请求头 x-yinum-slot 选择使用哪个 Key：default | lucky | ziwei
 */

const UPSTREAM = 'https://api.deepseek.com/chat/completions';

function pickKey(env, slot) {
  if (slot === 'lucky') return env.DEEPSEEK_API_KEY_LUCKY || env.DEEPSEEK_API_KEY;
  if (slot === 'ziwei') return env.DEEPSEEK_API_KEY_ZIWEI || env.DEEPSEEK_API_KEY;
  return env.DEEPSEEK_API_KEY;
}

function corsHeaders(allowed, contentType) {
  const h = {
    'Access-Control-Allow-Origin': allowed || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-yinum-slot'
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

function json(obj, status, allowed) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(allowed, 'application/json')
  });
}

export async function onRequestPost({ request, env }) {
  const allowed = env.ALLOWED_ORIGIN;
  const origin = request.headers.get('origin');
  if (allowed && origin && origin !== allowed) {
    return json({ error: 'forbidden_origin' }, 403, allowed);
  }

  const slot = (request.headers.get('x-yinum-slot') || 'default').toLowerCase();
  const key = pickKey(env, slot);
  if (!key) {
    return json({ error: 'missing_api_key', slot }, 500, allowed);
  }

  let payload;
  try {
    payload = await request.text();
  } catch (e) {
    return json({ error: 'bad_request' }, 400, allowed);
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: payload
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: corsHeaders(allowed, upstream.headers.get('content-type'))
    });
  } catch (e) {
    return json({ error: 'upstream_error', message: String((e && e.message) || e) }, 502, allowed);
  }
}

export async function onRequestOptions({ env }) {
  return new Response(null, { status: 204, headers: corsHeaders(env.ALLOWED_ORIGIN) });
}
