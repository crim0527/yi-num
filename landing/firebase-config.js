/* =========================================================
   Yi-Num · Firebase 配置
   ---------------------------------------------------------
   在 Firebase 控制台（https://console.firebase.google.com）创建项目后：
   1. 启用 Authentication → Sign-in method 中的
      - 「电子邮件链接（无密码登录）」Email link (passwordless)
      - 「Google」
   2. 将下方 YOUR_ 开头的占位符替换为真实值
   3. 在 Authentication → Settings → Authorized domains 中加入你的域名
   4. 把本文件的 <script> 引入到 login.html（已在其中）
   配置为占位符（含 YOUR_ 前缀）时，登录会自动回退到「开发模式」，
   本地生成 6 位验证码并回显到控制台 / 页面，便于无凭证联调。
   ========================================================= */
window.YiNumFirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};

/* 配置仍为占位符 → 禁用 Firebase，使用开发模式 */
window.YiNumFirebaseEnabled = !/YOUR_/.test(
  (window.YiNumFirebaseConfig.apiKey || '') + (window.YiNumFirebaseConfig.authDomain || '')
);
