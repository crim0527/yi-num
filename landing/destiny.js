/* =========================================================
   Yi-Num · 命数（基础信息输入）
   语言切换 + 抽屉菜单 + 表单校验 + 太极推演加载 → 跳转详情
   移动端时间选择：底部弹层滚轮；PC：原生下拉
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 语言切换（注册监听，刷新下拉占位符） ---------- */
  function refreshPlaceholders() {
    if (!ph) return; // ph 在 i18n.init 回调阶段尚未初始化，安全跳过
    var t = window.YiNumI18n ? window.YiNumI18n.t : function (k) { return k; };
    if (ph.year) ph.year.textContent = t('phYear');
    if (ph.month) ph.month.textContent = t('phMonth');
    if (ph.day) ph.day.textContent = t('phDay');
    if (ph.hour) ph.hour.textContent = t('phHour');
    if (ph.gender) ph.gender.textContent = t('phGender');
    syncAllTexts();   // 触发器文案随语言刷新
  }

  if (window.YiNumI18n) window.YiNumI18n.init(refreshPlaceholders);

  /* ---------- 抽屉菜单 ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');

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

  /* ---------- 表单元素 ---------- */
  var T = window.YiNumI18n ? window.YiNumI18n.t : function (k) { return k; };
  var form = document.getElementById('destinyForm');
  var yearSel = document.getElementById('birthYear');
  var monthSel = document.getElementById('birthMonth');
  var daySel = document.getElementById('birthDay');
  var hourSel = document.getElementById('birthHour');
  var hourTrigger = document.getElementById('hourTrigger');
  var hourTriggerText = document.getElementById('hourTriggerText');
  var unknown = document.getElementById('unknownTime');
  var genderSel = document.getElementById('birthGender');
  var errorEl = document.getElementById('formError');
  var derive = document.getElementById('derive');
  // 通用底部弹层滚轮
  var pickerMask = document.getElementById('pickerMask');
  var pickerSheet = document.getElementById('pickerSheet');
  var pickerCols = document.getElementById('pickerCols');
  var pickerUnits = document.getElementById('pickerUnits');
  var pickerTitle = document.getElementById('pickerTitle');
  var pickerCancel = document.getElementById('pickerCancel');
  var pickerConfirm = document.getElementById('pickerConfirm');
  var dateTrigger = document.getElementById('dateTrigger');
  var dateTriggerText = document.getElementById('dateTriggerText');
  var genderTrigger = document.getElementById('genderTrigger');
  var genderTriggerText = document.getElementById('genderTriggerText');
  var ph = {};
  var submitting = false;

  function makeOpt(value, label) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }
  function addPlaceholder(sel) {
    var o = makeOpt('', '');
    o.hidden = true; // 占位项不可被重新选中，仅作默认提示
    sel.appendChild(o);
    return o;
  }

  /* 年 / 月 / 日：同时构建原生 select（值容器）与滚轮数据 */
  var YEAR_ITEMS = [], MONTH_ITEMS = [], DAY_ITEMS = [];
  var yEnd = new Date().getFullYear();
  for (var y = yEnd; y >= 1940; y--) {
    YEAR_ITEMS.push({ value: String(y), label: String(y) });
    yearSel.appendChild(makeOpt(String(y), String(y)));
  }
  for (var m = 1; m <= 12; m++) {
    MONTH_ITEMS.push({ value: String(m), label: String(m) });
    monthSel.appendChild(makeOpt(String(m), String(m)));
  }
  for (var d = 1; d <= 31; d++) {
    DAY_ITEMS.push({ value: String(d), label: String(d) });
    daySel.appendChild(makeOpt(String(d), String(d)));
  }
  /* 出生时间（整点：HH:00） */
  var HOURS = [];
  for (var h = 0; h < 24; h++) {
    var s = String(h).padStart(2, '0');
    HOURS.push({ value: String(h), label: s + ':00' });
    hourSel.appendChild(makeOpt(String(h), s + ':00'));
  }

  ph.year = addPlaceholder(yearSel);
  ph.month = addPlaceholder(monthSel);
  ph.day = addPlaceholder(daySel);
  ph.hour = addPlaceholder(hourSel);
  // 性别
  genderSel.appendChild(makeOpt('male', T('genderMale')));
  genderSel.appendChild(makeOpt('female', T('genderFemale')));
  ph.gender = addPlaceholder(genderSel);
  refreshPlaceholders();

  /* ---------- 通用底部弹层滚轮（出生年月日 / 出生时间 / 性别） ---------- */
  var activeCols = [];
  var closeTimer = null;

  /* 将某行滚到列中线（用 scrollTop 增量，避免 scrollIntoView 带动整页滚动） */
  function centerRow(col, row) {
    var cr = col.getBoundingClientRect();
    var rr = row.getBoundingClientRect();
    col.scrollTop += (rr.top + rr.height / 2) - (cr.top + cr.height / 2);
  }

  /* 构建单列：点击选中 + 拖拽（滚动停止）自动选中中线项 */
  function buildColumn(items, currentValue, onSelect) {
    var col = document.createElement('div');
    col.className = 'picker-col';
    var rows = [];
    items.forEach(function (it) {
      var r = document.createElement('button');
      r.type = 'button';
      r.className = 'picker-row';
      r.textContent = it.label;
      r.dataset.value = String(it.value);
      r.addEventListener('click', function () {
        centerRow(col, r);
        onSelect(String(it.value));
      });
      col.appendChild(r);
      rows.push(r);
    });
    pickerCols.appendChild(col);

    function mark(value) {
      rows.forEach(function (r) { r.classList.toggle('active', r.dataset.value === String(value)); });
    }
    function center(value) {
      var target = null;
      rows.forEach(function (r) { if (r.dataset.value === String(value)) target = r; });
      if (target) centerRow(col, target);
    }

    /* 上下拖拽：滚动停止后取最靠近中线的行作为选中项 */
    var timer = null;
    col.addEventListener('scroll', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var cr = col.getBoundingClientRect();
        var mid = cr.top + cr.height / 2;
        var best = null, bestD = Infinity;
        rows.forEach(function (r) {
          var rr = r.getBoundingClientRect();
          var dist = Math.abs(rr.top + rr.height / 2 - mid);
          if (dist < bestD) { bestD = dist; best = r; }
        });
        if (best) onSelect(best.dataset.value);
      }, 120);
    }, { passive: true });

    mark(currentValue);
    return { mark: mark, center: center };
  }

  /* 打开滚轮弹层：columns = [{ unit?, items, value, onSelect }] */
  function openPicker(title, columns) {
    if (!pickerSheet || submitting) return;
    /* 取消上一次关闭的延时清理，避免「完成」后立刻点其他字段时列被清空 */
    if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
    if (pickerTitle) pickerTitle.textContent = title;
    pickerCols.textContent = '';

    /* 多列时显示顶部单位（年 / 月 / 日） */
    if (pickerUnits) {
      var hasUnit = columns.length > 1 && columns.some(function (c) { return !!c.unit; });
      pickerUnits.textContent = '';
      pickerUnits.hidden = !hasUnit;
      if (hasUnit) {
        columns.forEach(function (c) {
          var u = document.createElement('span');
          u.className = 'picker-unit';
          u.textContent = c.unit || '';
          pickerUnits.appendChild(u);
        });
      }
    }

    activeCols = columns.map(function (c, i) {
      return buildColumn(c.items, c.value, function (v) {
        c.onSelect(v);
        if (activeCols[i]) activeCols[i].mark(v);
      });
    });

    pickerMask.hidden = false;
    pickerSheet.hidden = false;
    requestAnimationFrame(function () {
      pickerMask.classList.add('show');
      pickerSheet.classList.add('open');
      activeCols.forEach(function (col, i) { col.center(columns[i].value); });
    });
  }

  function closePicker() {
    if (!pickerSheet) return;
    pickerMask.classList.remove('show');
    pickerSheet.classList.remove('open');
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      closeTimer = null;
      pickerMask.hidden = true;
      pickerSheet.hidden = true;
      pickerCols.textContent = '';
      activeCols = [];
    }, 280);
  }

  /* ---------- 触发器文案 ---------- */
  function isZh() {
    return !window.YiNumI18n || String(window.YiNumI18n.getLang()).indexOf('zh') === 0;
  }
  function syncDateText() {
    if (!dateTriggerText) return;
    var y = yearSel.value, m = monthSel.value, d = daySel.value;
    dateTriggerText.textContent = (!y || !m || !d)
      ? T('labelBirth')
      : (isZh() ? y + ' 年 ' + m + ' 月 ' + d + ' 日' : y + ' / ' + m + ' / ' + d);
  }
  function syncGenderText() {
    if (!genderTriggerText) return;
    var v = genderSel.value;
    genderTriggerText.textContent = v === 'male' ? T('genderMale')
      : v === 'female' ? T('genderFemale') : T('phGender');
  }
  function syncHourText() {
    if (!hourTriggerText) return;
    var item = null;
    for (var i = 0; i < HOURS.length; i++) if (HOURS[i].value === hourSel.value) { item = HOURS[i]; break; }
    hourTriggerText.textContent = (unknown.checked || !item) ? T('phHour') : item.label;
  }
  function syncAllTexts() { syncDateText(); syncGenderText(); syncHourText(); }

  /* ---------- 三个字段统一：点击 → 弹窗 → 上下拖拽选择 ---------- */
  if (dateTrigger) dateTrigger.addEventListener('click', function () {
    openPicker(T('labelBirth'), [
      { unit: T('phYear'), items: YEAR_ITEMS, value: yearSel.value,
        onSelect: function (v) { yearSel.value = v; syncDateText(); } },
      { unit: T('phMonth'), items: MONTH_ITEMS, value: monthSel.value,
        onSelect: function (v) { monthSel.value = v; syncDateText(); } },
      { unit: T('phDay'), items: DAY_ITEMS, value: daySel.value,
        onSelect: function (v) { daySel.value = v; syncDateText(); } }
    ]);
  });

  if (genderTrigger) genderTrigger.addEventListener('click', function () {
    openPicker(T('labelGender'), [
      { items: [{ value: 'male', label: T('genderMale') },
                { value: 'female', label: T('genderFemale') }],
        value: genderSel.value,
        onSelect: function (v) { genderSel.value = v; syncGenderText(); } }
    ]);
  });

  if (hourTrigger) hourTrigger.addEventListener('click', function () {
    if (unknown.checked) return;
    openPicker(T('labelTime'), [
      { items: HOURS, value: hourSel.value,
        onSelect: function (v) { hourSel.value = v; syncHourText(); } }
    ]);
  });

  if (pickerMask) pickerMask.addEventListener('click', closePicker);
  if (pickerCancel) pickerCancel.addEventListener('click', closePicker);
  if (pickerConfirm) pickerConfirm.addEventListener('click', closePicker);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pickerSheet && !pickerSheet.hidden) closePicker();
  });

  /* ---------- 带入本地已有数据（编辑 / 重新推演时自动填充） ---------- */
  var saved = window.YiNumUser ? window.YiNumUser.getUserData() : null;
  if (saved) {
    if (saved.year) yearSel.value = saved.year;
    if (saved.month) monthSel.value = saved.month;
    if (saved.day) daySel.value = saved.day;
    if (saved.gender) genderSel.value = saved.gender;
    if (saved.unknown) {
      unknown.checked = true;
      hourSel.disabled = true;
      if (hourTrigger) hourTrigger.disabled = true;
    } else if (saved.hour != null) {
      hourSel.value = saved.hour;
    }
  }
  syncAllTexts();

  /* ---------- 「不清楚具体时间」→ 置灰并清空时辰 ---------- */
  unknown.addEventListener('change', function () {
    hourSel.disabled = unknown.checked;
    if (hourTrigger) hourTrigger.disabled = unknown.checked;
    if (unknown.checked) hourSel.value = '';
    syncHourText();
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    form.classList.remove('shake');
    void form.offsetWidth; // 重触发抖动动画
    form.classList.add('shake');
  }
  form.addEventListener('animationend', function (e) {
    if (e.animationName === 'shake') form.classList.remove('shake');
  });

  /**
   * 路由跳转：统一在此替换真实路由
   * 静态站点：window.location.href = 'detail.html'
   * React Router： navigate('/detail')
   */
  function goToResult() {
    window.location.href = 'detail.html';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;

    if (!yearSel.value || !monthSel.value || !daySel.value) {
      showError(T('formError'));
      return;
    }
    if (!unknown.checked && !hourSel.value) {
      showError(T('formError'));
      return;
    }

    /* 收集出生信息（时间不清楚 → 由 API 模块默认处理为 12:00） */
    var birthInfo = {
      year: yearSel.value,
      month: monthSel.value,
      day: daySel.value,
      unknown: unknown.checked,
      hour: unknown.checked ? null : hourSel.value,
      gender: genderSel.value || null
    };

    /* 保存用户数据（覆盖），供结果页与「重新推演」回填 */
    if (window.YiNumUser) window.YiNumUser.saveUserData(birthInfo);

    errorEl.hidden = true;
    submitting = true;                 // 防止重复点击
    derive.hidden = false;             // 太极加载动画
    document.body.classList.add('is-locked');

    var D = window.YiNumDestiny;
    if (!D) { document.body.classList.remove('is-locked'); goToResult(); return; }

    /* 调用 DeepSeek 推演：成功 → 缓存结果并跳转；失败 → Toast + 兜底演示数据 */
    D.fetchDestinyData(birthInfo).then(function (data) {
      D.saveResult(data);
      document.body.classList.remove('is-locked');
      goToResult();
    }).catch(function (err) {
      document.body.classList.remove('is-locked');
      derive.hidden = true;
      submitting = false;              // 允许重新推演
      D.showToast(T('deriveFailed'));
      D.saveResult(D.FALLBACK);
      goToResult();
    });
  });
})();
