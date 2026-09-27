(function () {
  'use strict';

  /* ---------- 语言切换（全站共享 i18n） ---------- */
  if (window.YiNumI18n) window.YiNumI18n.init();

  /* ---------- sticky header state ---------- */
  var header = document.getElementById('siteHeader');
  var onScroll = function () {
    header.classList.toggle('is-stuck', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 罗盘指针微视差 ---------- */
  var card = document.querySelector('.chart-card');
  if (card && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var raf = null, tx = 0, ty = 0, cx = 0, cy = 0;

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      card.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    function kick() {
      if (raf === null) raf = requestAnimationFrame(loop);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var nx = (e.clientX / window.innerWidth - 0.5) * 2;
      var ny = (e.clientY / window.innerHeight - 0.5) * 2;
      tx = nx * -10;
      ty = ny * -8;
      kick();
    }, { passive: true });
  }
})();
