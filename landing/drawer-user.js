/* =========================================================
   Yi-Num · 抽屉底部「个人中心」入口：显示真实登录状态
   ---------------------------------------------------------
   - 直接读取 auth.js 写入的 yinum.auth，无需各页额外加载 auth.js；
   - 每次打开抽屉刷新一次，切换语言 / 其他标签页登录登出也会同步；
   - 依赖较弱：元素不存在时静默退出（首页 / 关于等非抽屉页不受影响）。
   ========================================================= */
(function () {
  'use strict';

  var AUTH_KEY = 'yinum.auth';

  function t(key) { return window.YiNumI18n ? window.YiNumI18n.t(key) : key; }

  function readUser() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      var u = JSON.parse(raw);
      return (u && u.email) ? u : null;
    } catch (e) { return null; }
  }

  function apply() {
    var row = document.querySelector('.drawer-user');
    if (!row) return;

    var nameEl = row.querySelector('.drawer-user-name');
    var subEl = row.querySelector('.drawer-user-sub');
    var avatarEl = row.querySelector('.drawer-avatar');

    var user = readUser();
    if (user && user.email) {
      var nick = String(user.email).split('@')[0] || String(user.email);
      if (nameEl) nameEl.textContent = nick;
      if (subEl) subEl.textContent = String(user.email);
      if (avatarEl) avatarEl.textContent = nick.charAt(0).toUpperCase();
      row.setAttribute('aria-label', nick);
    } else {
      if (nameEl) nameEl.textContent = t('guest');
      if (subEl) subEl.textContent = t('drawerProfileHint');
      if (avatarEl) avatarEl.textContent = '易';
      row.removeAttribute('aria-label');
    }
  }

  apply();

  /* 打开抽屉时刷新；切换语言后（i18n 重刷文案）随后补一次 */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('#burger')) { window.setTimeout(apply, 0); return; }
    if (e.target.closest('.lang-opt')) { window.setTimeout(apply, 60); }
  });

  /* 多标签页同步：其他页登录 / 退出后本页即时刷新 */
  window.addEventListener('storage', function (e) {
    if (e.key === AUTH_KEY) apply();
  });
})();
