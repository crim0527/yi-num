/**
 * Yi-Num · Worker 入口（Workers + Static Assets 架构）
 *
 * - 静态资源（landing/）由 Cloudflare Assets 自动服务；
 * - 非 /api/* 请求不会进入本脚本；
 * - /api/deepseek 由本脚本转发，逻辑复用 functions/api/deepseek.js。
 */
import { onRequestPost as deepseekPost, onRequestOptions as deepseekOptions } from '../functions/api/deepseek.js';
import { onRequestPost as authPost, onRequestOptions as authOptions } from '../functions/api/auth.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/deepseek') {
      if (request.method === 'POST') {
        return deepseekPost({ request, env });
      }
      if (request.method === 'OPTIONS') {
        return deepseekOptions({ env });
      }
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/auth') {
      if (request.method === 'POST') {
        return authPost({ request, env });
      }
      if (request.method === 'OPTIONS') {
        return authOptions({ env });
      }
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 兜底：交给静态资源（一般到不了这里，assets 未命中才进 Worker）
    return env.ASSETS.fetch(request);
  }
};
