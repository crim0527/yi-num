/* =========================================================
   Yi-Num · 紫微斗数（结果页 ZiWeiResultPage）

   职责（与启动页 ziwei.html 分离）：
     1. 进入时读取当天结果（ziweiDaily_YYYY-MM-DD）；无则回启动页
     2. 渲染运势结果（整体 / 四维度 / 幸运色数字 / 宜忌）
     3. 「重新推演」：清除当天缓存后重新调用 API 并就地渲染
     4. 语言切换 / 抽屉菜单（与全站一致）
   ========================================================= */
(function () {
  'use strict';

  var Z = window.YiNumZiwei;

  var elResults = document.getElementById('zwResults');
  var elLoading = document.getElementById('zwLoading');
  var redoBtn = document.getElementById('zwRedo');

  var busy = false;
  var today = new Date();

  function t(k) { return window.YiNumI18n ? window.YiNumI18n.t(k) : k; }
  function getUser() { return window.YiNumUser ? window.YiNumUser.getUserData() : null; }

  function showLoading(on) { if (elLoading) elLoading.hidden = !on; }

  /* ---------- 渲染 ---------- */
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }
  function fillList(id, items) {
    var ul = document.getElementById(id);
    if (!ul) return;
    ul.textContent = '';
    (items || []).forEach(function (v) {
      var li = document.createElement('li');
      li.textContent = v;
      ul.appendChild(li);
    });
  }
  function staggerIn() {
    var cards = elResults ? elResults.querySelectorAll('.zw-card') : [];
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--d', (i * 0.1).toFixed(1) + 's');
      card.classList.remove('is-in');
      void card.offsetWidth;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { card.classList.add('is-in'); });
      });
      window.setTimeout(function () { card.classList.add('is-in'); }, 80);
    });
  }
  function renderResult(raw) {
    if (!raw) return;
    var lang = window.YiNumI18n ? window.YiNumI18n.getLang() : 'zh-CN';
    var data = Z.pickLang(raw, lang);
    if (!data) return;
    setText('zwOverallText', data.overall);
    setText('zwCareerText', data.career);
    setText('zwWealthText', data.wealth);
    setText('zwLoveText', data.love);
    setText('zwHealthText', data.health);

    var swatch = document.getElementById('zwSwatch');
    var color = data.luckyColor || {};
    if (swatch && color.hex) swatch.style.background = color.hex;
    setText('zwColorName', color.name || '');

    var numsEl = document.getElementById('zwNums');
    if (numsEl) {
      numsEl.textContent = '';
      (data.luckyNumbers || []).forEach(function (n) {
        var s = document.createElement('span');
        s.className = 'zw-num';
        s.textContent = n;
        numsEl.appendChild(s);
      });
      numsEl.setAttribute('aria-label', (data.luckyNumbers || []).join('、'));
    }

    fillList('zwYiList', data.suitable);
    fillList('zwJiList', data.avoid);

    if (elResults) elResults.hidden = false;
    staggerIn();
    if (raw.isFallback && Z) Z.showToast(t('fallbackNote'));
  }

  /* ---------- 重新推演：清缓存 → 重新请求 → 渲染 ---------- */
  function run() {
    if (!Z || busy) return;
    var birth = getUser();
    if (!birth || !birth.year || !birth.month || !birth.day) {
      location.replace('ziwei.html');
      return;
    }
    busy = true;
    showLoading(true);
    Z.fetchZiweiDaily(birth, today).then(function (data) {
      Z.saveResult(today, data);
      renderResult(data);
    }).catch(function () {
      Z.showToast(t('deriveFailed'));
      renderResult(Z.FALLBACK);
    }).then(function () {
      busy = false;
      showLoading(false);
    });
  }

  /* ---------- 初始化：无结果回启动页 ---------- */
  function initView() {
    var cached = Z ? Z.getResult(today) : null;
    if (!cached) { location.replace('ziwei.html'); return; }
    renderResult(cached);
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    if (redoBtn) {
      redoBtn.addEventListener('click', function () {
        if (busy || !Z) return;
        Z.clearResult(today);
        run();
      });
    }

    if (window.YiNumI18n) {
      window.YiNumI18n.init(function () {
        /* 语言切换：若结果已渲染，重新渲染（文案来自数据，与语言无关，这里仅刷新兜底提示等） */
        var cached = Z ? Z.getResult(today) : null;
        if (cached && elResults && !elResults.hidden) renderResult(cached);
      });
    }

    (function bindDrawer() {
      var burger = document.getElementById('burger');
      var drawer = document.getElementById('drawer');
      var scrim = document.getElementById('scrim');
      if (!burger || !drawer || !scrim) return;
      function setDrawer(open) {
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        drawer.hidden = !open; scrim.hidden = !open;
      }
      burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
      scrim.addEventListener('click', function () { setDrawer(false); });
      var dc = document.getElementById('drawerClose');
      if (dc) dc.addEventListener('click', function () { setDrawer(false); });
      drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !drawer.hidden) setDrawer(false);
      });
    })();
  }

  bindEvents();
  initView();
})();
