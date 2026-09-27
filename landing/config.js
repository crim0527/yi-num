/* =========================================================
   Yi-Num · 本地配置（务必加入 .gitignore，不要提交仓库）

   在此填入 DeepSeek API Key；也可覆盖接口地址、模型、超时等。
   接入 Vite / Rollup 等构建工具后，可改为：
     window.YiNumConfig = { DEEPSEEK_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY };

   安全提示：前端直接持有 API Key 会暴露给所有访问者，
   仅建议本地开发 / 演示使用；生产环境请改为由后端代理转发。
   ========================================================= */
window.YiNumConfig = {
  /* DeepSeek 代理地址：真实 API Key 由 Cloudflare Pages Function 持有并转发，
     前端不再保存任何 Key。
     本地调试可改为已部署的 Worker 地址，或直接在浏览器控制台执行：
       localStorage.setItem('yinum.debug.apiBase', '<worker-url>/api/deepseek') */
  DEEPSEEK_API_BASE: '/api/deepseek',

  DEEPSEEK_MODEL: 'deepseek-chat',
  DEEPSEEK_JSON_MODE: true,   // 开启 JSON 输出模式；若接口报错可设为 false
  DEEPSEEK_TIMEOUT_MS: 60000
};
