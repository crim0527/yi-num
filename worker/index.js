/**
 * Yi-Num · Worker 入口（Workers + Static Assets 架构）
 *
 * - 静态资源（landing/）由 Cloudflare Assets 自动服务；
 * - 非 /api/* 请求不会进入本脚本；
 * - /api/deepseek 由本脚本转发，逻辑复用 functions/api/deepseek.js。
 */
import { onRequestPost, onRequestOptions } from '../functions/api/deepseek.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/deepseek') {
      if (request.method === 'POST') {
        return onRequestPost({ request, env });
      }
      if (request.method === 'OPTIONS') {
        return onRequestOptions({ env });
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
