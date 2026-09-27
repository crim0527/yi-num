/* =========================================================
   Yi-Num · 吉时（LuckyTimePage）
   语言切换 + 右侧抽屉菜单 + 日期筛选器组件（LuckyTimeDatePicker）
   内容区逻辑：见 lucky-time.html #ltpDates
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 语言切换（全站共享：init 会绑定切换器并刷新文案） ----------
     维护一组回调：切换语言时同步刷新时间线、弹窗标题与正文（弹窗已打开时同样生效） */
  var langHandlers = [];
  function onLangChange() { langHandlers.forEach(function (fn) { if (typeof fn === 'function') fn(); }); }
  if (window.YiNumI18n) window.YiNumI18n.init(onLangChange);

  /* ---------- 吉时信息卡片（顶部） ---------- */
  initLuckyInfoCard();

  /* ---------- 吉时日期筛选器组件 ---------- */
  var datePicker = initLuckyDatePicker();

  /* ---------- 吉时推演数据（DeepSeek + LocalStorage 缓存） ---------- */
  initLuckyData(datePicker);

  /* ---------- 批语底部弹窗 ---------- */
  initLuckySheet();

  /* ---------- 批语溢出自适应：过长则限行 + 显示「查看全部」 ---------- */
  applyLuckyOverflow();
  window.addEventListener('resize', applyLuckyOverflow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(applyLuckyOverflow);

  /* ---------- 右侧抽屉菜单 ---------- */
  (function bindDrawer() {
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

  /* =======================================================
     LuckyTimeInfoCard · 吉时信息卡片
     红点竖线时间线：吉时/凶时 + 批语（顶部时辰大字与日期已移除）
     数据以 props 形式注入：
     LuckyTimeInfoCard.set({ luckyRange, badRange })
     ======================================================= */
  function initLuckyInfoCard() {
    var cardEl = document.getElementById('ltpCard');
    var luckyRangeEl = document.getElementById('ltpLuckyRange');
    var badRangeEl = document.getElementById('ltpBadRange');
    if (!cardEl) return;

    /* ---- mock 数据：后续由接口替换 ---- */
    var info = {
      luckyRange: '15:00 - 17:00',                 /* 吉时时间段 */
      badRange: '23:00 - 00:59 · 01:00 - 02:59'    /* 凶时时间段（子时 + 丑时，合并为一个板块） */
    };

    function render() {
      if (luckyRangeEl) luckyRangeEl.textContent = info.luckyRange;
      if (badRangeEl) badRangeEl.textContent = info.badRange;
    }

    render();

    /* 组件 API：外部可更新数据 */
    window.LuckyTimeInfoCard = {
      get: function () { return info; },
      set: function (data) {
        for (var k in data) {
          if (Object.prototype.hasOwnProperty.call(data, k)) info[k] = data[k];
        }
        render();
      }
    };
  }

  /* =======================================================
     LuckyTimeSheet · 批语底部弹窗
     点击整张卡片，弹出 Bottom Sheet 集中展示吉时/凶时完整批语
     ======================================================= */
  function initLuckySheet() {
    var card = document.getElementById('ltpCard');
    var scrim = document.getElementById('ltpSheetScrim');
    var sheet = document.getElementById('ltpSheet');
    var bodyEl = document.getElementById('ltpSheetBody');
    var titleEl = document.getElementById('ltpSheetTitle');
    if (!scrim || !sheet) return;

    /* 弹窗标题按当前语言显式设置（双保险，避免依赖 data-i18n 渲染时机） */
    function syncTitle() {
      if (!titleEl) return;
      titleEl.textContent = window.YiNumI18n ? window.YiNumI18n.t('luckySheetTitle') : '今日批语';
    }

    var closeTimer = null;

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    /* 从时间线 DOM 收集吉时/凶时，构建弹窗正文 */
    function buildBody() {
      if (!bodyEl) return;
      var items = document.querySelectorAll('#ltpCard .ltp-item');
      var html = '';
      Array.prototype.forEach.call(items, function (item) {
        var labelEl = item.querySelector('.ltp-item-title > span');
        var timeEl = item.querySelector('.ltp-item-time');
        var textEl = item.querySelector('.ltp-item-text');
        var label = labelEl ? labelEl.textContent.trim() : '';
        var time = timeEl ? timeEl.textContent.trim() : '';
        var text = textEl ? textEl.textContent.trim() : '';
        html += '<div class="ltp-sheet-block">' +
                  '<h4 class="ltp-sheet-block-title">' + escapeHtml(label) +
                    (time ? ' <span class="ltp-sheet-time">' + escapeHtml(time) + '</span>' : '') +
                  '</h4>' +
                  '<p class="ltp-sheet-block-text">' + escapeHtml(text) + '</p>' +
                '</div>';
      });
      bodyEl.innerHTML = html;
    }

    /* 切换语言时同步刷新弹窗：标题必刷新，正文仅在弹窗已打开时重建 */
    langHandlers.push(function () {
      syncTitle();
      if (!sheet.hidden) buildBody();
    });

    function open() {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      syncTitle();
      buildBody();
      scrim.hidden = false;
      sheet.hidden = false;
      /* 下一帧加 class 触发过渡动画 */
      requestAnimationFrame(function () {
        scrim.classList.add('is-open');
        sheet.classList.add('is-open');
      });
    }

    function close() {
      scrim.classList.remove('is-open');
      sheet.classList.remove('is-open');
      closeTimer = window.setTimeout(function () {
        scrim.hidden = true;
        sheet.hidden = true;
      }, 300);
    }

    if (card) card.addEventListener('click', open);
    scrim.addEventListener('click', close);

    syncTitle();   /* 初始按当前语言设置一次 */
  }

  /* =======================================================
     LuckyTimeDatePicker
     上下结构：顶部年月 / 底部 5 天（今天居中）
     点击两侧日期 → 平滑移动圆圈与红点至中心，并触发 onDateChange
     ======================================================= */
  function initLuckyDatePicker() {
    var root = document.getElementById('ltpDates');
    if (!root) return;

    /* ---- mock 数据：单页 5 天，今天居中（第 3 个位置）；圈内显示“几号” ---- */
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var items = [-2, -1, 0, 1, 2].map(function (off) {
      var d = new Date(today);
      d.setDate(today.getDate() + off);       // 今天前两天 ~ 后两天
      return { label: String(d.getDate()), date: d };
    });

    var selected = 2;   // 默认选中“今天”

    /* 渲染 5 个日期按钮 */
    items.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ltp-date';
      btn.setAttribute('data-index', String(i));
      var span = document.createElement('span');
      span.className = 'ltp-date-text';
      span.textContent = item.label;
      btn.appendChild(span);
      btn.addEventListener('click', function () { select(i); });
      root.appendChild(btn);
    });

    /* 渲染选中指示器（圆圈 + 下缘红弧 + 红点 + 竖排小字） */
    var indicator = document.createElement('div');
    indicator.className = 'ltp-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML =
      '<div class="ltp-circle">' +
        '<span class="ltp-num"></span>' +
        /* 下缘约 1/6 的红色圆弧：从 60° 到 120°，正中朝下 */
        '<svg class="ltp-arc" viewBox="0 0 64 64" aria-hidden="true">' +
          '<circle cx="32" cy="32" r="30" fill="none" stroke="#D32F2F" stroke-width="2"' +
                  ' stroke-linecap="round" stroke-dasharray="31 158"' +
                  ' transform="rotate(60 32 32)" />' +
        '</svg>' +
      '</div>' +
      '<span class="ltp-date-dot"></span>' +
      '<span class="ltp-label"></span>';
    root.appendChild(indicator);

    var numEl = indicator.querySelector('.ltp-num');
    var labelEl = indicator.querySelector('.ltp-label');

    /* 横向月份：仅显示「X月」，去除年份 */
    function formatYM(d) {
      return (d.getMonth() + 1) + '月';
    }

    function moveIndicator() {
      var btns = root.querySelectorAll('.ltp-date');
      var slot = btns[selected];
      if (!slot) return;
      var x = slot.offsetLeft + slot.offsetWidth / 2;   // 容器左缘到该日期中心
      indicator.style.transform = 'translate(calc(-50% + ' + x + 'px), -50%)';
    }

    function select(i) {
      if (i === selected) return;
      selected = i;
      render();
    }

    function render() {
      var btns = root.querySelectorAll('.ltp-date');
      btns.forEach(function (b, i) {
        var dist = Math.abs(i - selected);
        b.classList.toggle('is-center', dist === 0);
        b.classList.toggle('is-adj', dist === 1);   /* 紧邻中心：中灰 */
        /* dist === 2 保持基色（最浅） */
      });
      numEl.textContent = items[selected].label;
      labelEl.textContent = formatYM(items[selected].date);
      moveIndicator();

      /* 生命周期：预留数据更新接口（后续在此拉取吉时结果） */
      if (typeof window.onLuckyDateChange === 'function') {
        window.onLuckyDateChange(items[selected].date, items[selected].label, selected);
      }
      if (typeof initLuckyDatePicker.onChange === 'function') {
        initLuckyDatePicker.onChange(items[selected].date, items[selected].label, selected);
      }
    }

    /* 初次渲染：等布局稳定后再定位指示器，避免拿到 0 偏移 */
    render();
    requestAnimationFrame(moveIndicator);
    window.addEventListener('resize', moveIndicator);
    window.addEventListener('load', moveIndicator);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(moveIndicator);   // 宋体加载后宽度变化，重新定位圆圈
    }

    /* 暴露组件 API */
    initLuckyDatePicker.api = {
      getSelected: function () { return items[selected]; },
      setOnChange: function (fn) { initLuckyDatePicker.onChange = fn; }
    };
    return initLuckyDatePicker.api;
  }

  /* =======================================================
     LuckyTimeData · 吉时推演数据（DeepSeek API + LocalStorage 缓存）
     1. 进入页面：优先读缓存；无缓存则用全局用户信息（YiNumUser）请求
     2. 切换日期：先查该日期缓存，未命中则按该日期重新推演
     3. 请求中显示太极加载层并加锁，防止重复点击
     4. 失败：Toast 提示 + 展示兜底演示数据
     ======================================================= */
  function initLuckyData(datePicker) {
    var L = window.YiNumLucky;
    if (!L) return;

    var loadingEl = document.getElementById('ltpLoading');
    var busy = false;              // 请求锁：防止重复点击
    var fallbackNotified = false;
    var lastData = null;            // 最近一次加载的数据（语言切换时重绘，不重新请求）

    function t(k) { return window.YiNumI18n ? window.YiNumI18n.t(k) : k; }

    /* 用推演结果覆盖文案，并摘掉 data-i18n，避免语言切换把译文写回覆盖真实结果 */
    function setText(id, value) {
      var el = document.getElementById(id);
      if (!el || !value) return;
      el.removeAttribute('data-i18n');
      el.textContent = value;
    }

    /* 渲染：吉时 / 凶时 的 时间段 + 标题 + 批语（按当前语言选取语种块） */
    function render(data) {
      if (!data) return;
      lastData = data;
      var d = L.pickLang(data, window.YiNumI18n ? window.YiNumI18n.getLang() : 'zh-CN');
      if (!d || !d.luckyTime || !d.unluckyTime) return;
      setText('ltpLuckyTitle', d.luckyTime.title);
      setText('ltpLuckyRange', d.luckyTime.period);
      setText('ltpLuckyComment', d.luckyTime.comment);
      setText('ltpBadTitle', d.unluckyTime.title);
      setText('ltpBadRange', d.unluckyTime.period);
      setText('ltpBadComment', d.unluckyTime.comment);

      /* 同步信息卡片组件，保持组件内数据一致 */
      if (window.LuckyTimeInfoCard) {
        window.LuckyTimeInfoCard.set({
          luckyRange: d.luckyTime.period,
          badRange: d.unluckyTime.period
        });
      }
      applyLuckyOverflow();   // 新文案可能触发「查看全部」折叠

      if (data.isFallback && !fallbackNotified) {
        fallbackNotified = true;
        L.showToast(t('fallbackNote'));
      }
    }

    function showLoading(on) {
      if (loadingEl) loadingEl.hidden = !on;
    }

    /* 取某天数据：命中缓存直接渲染，否则调用 API */
    function load(date) {
      if (busy) return;
      var key = L.formatDate(date);
      var cached = L.getResult(key);
      if (cached) { render(cached); return; }

      /* 出生信息与【命数】共用：window.YiNumUser（全局用户信息存储） */
      var birth = window.YiNumUser ? window.YiNumUser.getUserData() : null;
      if (!birth || !birth.year || !birth.month || !birth.day) {
        L.showToast(t('luckyNeedProfile'));   // 提示先去命数页完善出生信息
        render(L.FALLBACK);
        return;
      }

      busy = true;
      showLoading(true);
      L.fetchLuckyTimeData(birth, date).then(function (data) {
        L.saveResult(key, data);              // 按日期缓存，避免重复请求
        render(data);
      }).catch(function () {
        L.showToast(t('deriveFailed'));       // 推演失败，请稍后重试
        render(L.FALLBACK);                   // 兜底演示数据
      }).then(function () {
        busy = false;
        showLoading(false);
      });
    }

    /* 首次进入：直接请求今天（每日开启页 lucky-open.html 已负责记录与跳转） */
    load(new Date());

    /* 切换日期：命中缓存直接展示，否则按新日期重新推演 */
    if (datePicker && typeof datePicker.setOnChange === 'function') {
      datePicker.setOnChange(function (date) { load(date); });
    }

    /* 语言切换：用当前语言重绘时间线（命中缓存，不重新请求 API） */
    langHandlers.push(function () { if (lastData) render(lastData); });
  }

  /* =======================================================
     applyLuckyOverflow · 批语溢出自适应
     内容未溢出则完整展示；超出约 3 行时折叠并提示「查看全部」，
     点击条目即弹出 Bottom Sheet 看全文
     ======================================================= */
  function applyLuckyOverflow() {
    var texts = document.querySelectorAll('.ltp-item-text');
    Array.prototype.forEach.call(texts, function (t) {
      t.classList.remove('is-clamped');
      var more = t.parentNode ? t.parentNode.querySelector('.ltp-item-more') : null;
      var cs = window.getComputedStyle(t);
      var lineH = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.9);
      var maxH = lineH * 4 + 1;
      /* 未限行时 scrollHeight 即全文高度，据此判断是否溢出 */
      if (t.scrollHeight > maxH) {
        t.classList.add('is-clamped');
        if (more) more.hidden = false;
      } else if (more) {
        more.hidden = true;
      }
    });
  }
})();
