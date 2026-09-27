/* =========================================================
   Yi-Num · 问事（AskPage）
   语言切换 + 抽屉菜单（与命数页一致）
   内容区逻辑：见 ask.html #askContent，后续开发
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 语言切换（全站共享：init 会绑定切换器并刷新文案） ---------- */
  if (window.YiNumI18n) window.YiNumI18n.init();

  /* ---------- 抽屉菜单 ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');
  if (!burger || !drawer || !scrim) return;

  function setDrawer(open) {
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.hidden = !open;
    scrim.hidden = !open;
  }

  burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
  scrim.addEventListener('click', function () { setDrawer(false); });

  var drawerClose = document.getElementById('drawerClose');
  if (drawerClose) drawerClose.addEventListener('click', function () { setDrawer(false); });

  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setDrawer(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.hidden) setDrawer(false);
  });
})();
