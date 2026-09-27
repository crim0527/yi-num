/* =========================================================
   Yi-Num · 吉时「每日开启页」（独立页面，点击【吉时】菜单后的第一个页面）
   流程：
     进入本页 → 当天已开启则直接跳详情页（lucky-time.html）
             → 未开启则展示开启页 → 点击「开启今日吉时」
             → 写入当天记录 → 淡出 → 跳转详情页（详情页负责调用 API 并展示加载动画）

   对外接口（window.YiNumLuckyOpen）：
     checkTodayOpened(date)  当天是否已开启（localStorage: luckyTimeOpened_YYYY-MM-DD）
     markTodayOpened(date)   写入当天开启记录
     formatDate(date)        统一日期格式 YYYY-MM-DD
     state.isTodayOpened     当前是否已开启（状态标记）
     gotoDetail()            淡出并跳转吉时详情页
   ========================================================= */
(function () {
  'use strict';

  var KEY_PREFIX = 'luckyTimeOpened_';
  var DETAIL_URL = 'lucky-time.html';
  var state = { isTodayOpened: false };

  /* ---------------- 日期工具：统一 YYYY-MM-DD ---------------- */
  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDate(d) {
    var dt = (d instanceof Date) ? d : (d ? new Date(d) : new Date());
    if (isNaN(dt.getTime())) dt = new Date();
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  }

  function keyOf(date) { return KEY_PREFIX + formatDate(date || new Date()); }

  /* ---------------- 当天开启记录 ---------------- */
  function checkTodayOpened(date) {
    try {
      return localStorage.getItem(keyOf(date || new Date())) === 'true';
    } catch (e) {
      return false;   // 隐私模式：每次都展示开启页
    }
  }

  function markTodayOpened(date) {
    try {
      localStorage.setItem(keyOf(date || new Date()), 'true');
      state.isTodayOpened = true;
    } catch (e) { /* 静默 */ }
  }

  /* ---------------- 干支年 + 农历月（文案用） ----------------
     农历月以当年春节为基准按朔望月≈29.53天推算，未处理闰月，仅用于展示文案。 */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var LUNAR_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  /* 春节日期表（可按需续写） */
  var CNY = {
    2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17',
    2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13',
    2030: '2030-02-03'
  };

  function mod(n, m) { return ((n % m) + m) % m; }
  function ganzhiYear(y) { return GAN[mod(y - 4, 10)] + ZHI[mod(y - 4, 12)]; }

  function lunarMonth(d) {
    var y = d.getFullYear();
    var cnyStr = CNY[y];
    var cny = cnyStr ? new Date(cnyStr + 'T00:00:00') : null;
    if (cny && d < cny) {                     // 早于当年春节 → 仍属上一个农历年
      cnyStr = CNY[y - 1];
      cny = cnyStr ? new Date(cnyStr + 'T00:00:00') : null;
    }
    if (!cny) return (d.getMonth() + 1) + '月';   // 无表可查：退回公历月
    var days = Math.floor((d - cny) / 86400000);
    var idx = Math.floor(days / 29.53) + 1;
    idx = Math.max(1, Math.min(12, idx));
    return LUNAR_MONTH[idx - 1] + '月';
  }

  /* ---------------- 页面：渲染日期文案 ----------------
     数字与「月 / 日」拆成独立 span，统一衬线字体，数字更醒目 */
  function span(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function renderDate() {
    var today = new Date();
    var yearEl = document.getElementById('luckyOpenYear');
    var dateEl = document.getElementById('luckyOpenDate');
    if (yearEl) yearEl.textContent = ganzhiYear(today.getFullYear()) + '年 · ' + lunarMonth(today);
    if (dateEl) {
      dateEl.textContent = '';
      dateEl.appendChild(span('d-num', today.getMonth() + 1));   // 月（数字）
      dateEl.appendChild(span('d-unit', '月'));
      dateEl.appendChild(span('d-num', today.getDate()));         // 日（数字）
      dateEl.appendChild(span('d-unit', '日'));
    }
  }

  /* ---------------- 页面：淡出并跳转详情页 ---------------- */
  function gotoDetail() {
    var root = document.getElementById('luckyOpenRoot');
    if (root) root.classList.add('is-leaving');   // 整体淡出
    window.setTimeout(function () {
      window.location.href = DETAIL_URL;
    }, 400);
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    var root = document.getElementById('luckyOpenRoot');
    var card = root ? root.querySelector('.lucky-open-card') : null;
    var btn = document.getElementById('luckyOpenBtn');

    renderDate();

    /* 进入动画：上浮 20px + 淡入 */
    if (card) requestAnimationFrame(function () { card.classList.add('is-in'); });

    /* 点击：先写入 localStorage（避免刷新重复看到），再淡出跳转详情页 */
    if (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add('is-pressing');
        markTodayOpened(new Date());            // 1) 立即记录
        window.setTimeout(function () { btn.classList.remove('is-pressing'); }, 150);
        window.setTimeout(gotoDetail, 180);     // 2) 淡出 → 详情页（由详情页触发 API）
      });
    }

    /* 语言切换（全站共享） */
    if (window.YiNumI18n) window.YiNumI18n.init();

    /* 抽屉菜单（与其他页面一致） */
    var burger = document.getElementById('burger');
    var drawer = document.getElementById('drawer');
    var scrim = document.getElementById('scrim');
    if (burger && drawer && scrim) {
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
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.YiNumLuckyOpen = {
    KEY_PREFIX: KEY_PREFIX,
    formatDate: formatDate,
    checkTodayOpened: checkTodayOpened,
    markTodayOpened: markTodayOpened,
    gotoDetail: gotoDetail,
    state: state
  };
})();
