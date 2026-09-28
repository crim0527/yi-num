/* =========================================================
   Yi-Num · 个人中心 Profile
   ---------------------------------------------------------
   1) 个人资料卡：头像 / 昵称 / 邮箱 + 出生资料（复用命数页 yinum.user）
   2) 积分板块：我的积分 / 积分记录 / 一周打卡
   3) 退出登录：清本地会话并返回首页
   本地存储：
     yinum.user          —— 出生资料（与命数页共用）
     yinum.points        —— 积分总数
     yinum.pointsHistory —— 积分变动记录
     checkin_YYYY-MM-DD  —— 当天是否已打卡
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- i18n ---------------- */
  function t(key, vars) { return window.YiNumI18n ? window.YiNumI18n.t(key, vars) : key; }
  function lang() { return window.YiNumI18n ? String(window.YiNumI18n.getLang()) : 'zh-CN'; }
  function isZh() { return lang().indexOf('zh') === 0; }

  /* ---------------- DOM ---------------- */
  function $(id) { return document.getElementById(id); }

  var el = {
    avatarBtn: $('avatarBtn'), avatarText: $('avatarText'),
    nickText: $('nickText'), mailText: $('mailText'),
    factBirth: $('factBirth'), factTime: $('factTime'), factGender: $('factGender'),
    editTrigger: $('editTrigger'),
    pointsNum: $('pointsNum'), weekStrip: $('weekStrip'),
    checkinBtn: $('checkinBtn'), historyBtn: $('historyBtn'), signoutBtn: $('signoutBtn'),

    sheetMask: $('sheetMask'),
    editSheet: $('editSheet'), editCancel: $('editCancel'), editSave: $('editSave'), editError: $('editError'),
    historySheet: $('historySheet'), historyCancel: $('historyCancel'),
    historyList: $('historyList'), historyEmpty: $('historyEmpty'),

    editYear: $('editYear'), editMonth: $('editMonth'), editDay: $('editDay'),
    editHour: $('editHour'), editGender: $('editGender'),
    dateTrigger: $('dateTrigger'), dateTriggerText: $('dateTriggerText'),
    hourTrigger: $('hourTrigger'), hourTriggerText: $('hourTriggerText'),
    genderTrigger: $('genderTrigger'), genderTriggerText: $('genderTriggerText'),
    unknownTime: $('unknownTime'),

    pickerMask: $('pickerMask'), pickerSheet: $('pickerSheet'), pickerCols: $('pickerCols'),
    pickerUnits: $('pickerUnits'), pickerTitle: $('pickerTitle'),
    pickerCancel: $('pickerCancel'), pickerConfirm: $('pickerConfirm'),

    burger: $('burger'), drawer: $('drawer'), scrim: $('scrim'), drawerClose: $('drawerClose')
  };

  /* ---------------- 存储键 ---------------- */
  var POINTS_KEY = 'yinum.points';
  var HISTORY_KEY = 'yinum.pointsHistory';
  var CHECKIN_KEY = 'checkin_';
  var REWARD = 10;
  var HISTORY_MAX = 60;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 隐私模式静默 */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* 静默 */ } }
  function readJSON(k, fb) {
    var raw = lsGet(k);
    if (!raw) return fb;
    try {
      var v = JSON.parse(raw);
      return (v == null) ? fb : v;
    } catch (e) { return fb; }
  }
  function writeJSON(k, v) { lsSet(k, JSON.stringify(v)); }

  /* ---------------- 日期工具 ---------------- */
  function pad2(n) { n = Number(n); return n < 10 ? '0' + n : String(n); }
  function keyOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayKey() { return keyOf(new Date()); }
  function mondayOf(d) {
    var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var shift = (m.getDay() + 6) % 7;      // 周一 = 0
    m.setDate(m.getDate() - shift);
    return m;
  }

  /* ---------------- 积分 / 打卡 ---------------- */
  function getPoints() {
    var n = parseInt(lsGet(POINTS_KEY) || '0', 10);
    return (!n || isNaN(n) || n < 0) ? 0 : n;
  }
  function setPoints(n) { lsSet(POINTS_KEY, String(n)); }
  function isChecked(k) { return lsGet(CHECKIN_KEY + k) === '1'; }

  function addPoints(delta, title) {
    setPoints(getPoints() + delta);
    var list = readJSON(HISTORY_KEY, []);
    list.unshift({ title: title, delta: delta, ts: Date.now() });
    writeJSON(HISTORY_KEY, list.slice(0, HISTORY_MAX));
  }

  function doCheckin() {
    var k = todayKey();
    if (isChecked(k)) { toast(t('profileCheckinDone')); return; }
    lsSet(CHECKIN_KEY + k, '1');
    addPoints(REWARD, t('profileCheckinReward'));
    renderPoints();
    renderWeek();
    renderCheckinBtn();
    toast(t('profileCheckinEarn'));
  }

  /* ---------------- Toast（复用 app.css 的 .yi-toast） ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var box = $('yiToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'yiToast';
      box.className = 'yi-toast';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.remove('is-show');
    void box.offsetWidth;                       // 触发过渡
    box.classList.add('is-show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { box.classList.remove('is-show'); }, 2000);
  }

  /* ---------------- 用户资料 ---------------- */
  function userData() { return window.YiNumUser ? window.YiNumUser.getUserData() : null; }
  function currentAccount() {
    return (window.YiNumAuth && window.YiNumAuth.getCurrentUserSync)
      ? window.YiNumAuth.getCurrentUserSync() : null;
  }

  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function birthText(u) {
    if (!u || !u.year || !u.month || !u.day) return '';
    if (isZh()) return u.year + ' 年 ' + Number(u.month) + ' 月 ' + Number(u.day) + ' 日';
    try {
      return new Date(Number(u.year), Number(u.month) - 1, Number(u.day))
        .toLocaleDateString(lang(), { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return u.year + '/' + u.month + '/' + u.day;
    }
  }
  function timeText(u) {
    if (!u) return '';
    if (u.unknown) return t('profileTimeUnknown');
    if (u.hour == null || u.hour === '') return '';
    return pad2(u.hour) + ':00';
  }
  function genderText(u) {
    if (!u) return '';
    if (u.gender === 'male') return t('genderMale');
    if (u.gender === 'female') return t('genderFemale');
    return '';
  }
  function setFact(node, value) {
    if (!node) return;
    if (value) {
      node.textContent = value;
      node.classList.remove('is-empty');
    } else {
      node.textContent = t('profileEmpty');
      node.classList.add('is-empty');
    }
  }

  /* ---------------- 渲染 ---------------- */
  function renderIdentity() {
    var account = currentAccount();
    var email = (account && account.email) ? String(account.email) : '';
    if (email) {
      var nick = email.split('@')[0] || email;
      el.nickText.textContent = nick;
      el.mailText.textContent = email;
      el.avatarText.textContent = (nick || '易').charAt(0).toUpperCase();
    } else {
      el.nickText.textContent = t('profileEmailFallback');
      el.mailText.textContent = t('profileLoginHint');
      el.avatarText.textContent = '易';
    }
  }

  function renderFacts() {
    var u = userData();
    setFact(el.factBirth, birthText(u));
    setFact(el.factTime, timeText(u));
    setFact(el.factGender, genderText(u));
  }

  function renderPoints() { el.pointsNum.textContent = String(getPoints()); }

  function renderCheckinBtn() {
    var done = isChecked(todayKey());
    el.checkinBtn.textContent = done ? t('profileCheckinDone') : t('profileCheckin');
    el.checkinBtn.disabled = done;
  }

  function renderWeek() {
    var today = new Date();
    var todayIdx = (today.getDay() + 6) % 7;
    var monday = mondayOf(today);
    var labels = String(t('profileWeekdays')).split(',');
    if (!el.weekStrip) return;
    el.weekStrip.textContent = '';

    for (var i = 0; i < 7; i++) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      var k = keyOf(d);
      var done = isChecked(k);
      var future = i > todayIdx;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'p-day';
      if (done) btn.classList.add('is-done');
      if (i === todayIdx) btn.classList.add('is-today');
      if (future) btn.classList.add('is-future');
      btn.disabled = future;
      btn.dataset.date = k;
      btn.setAttribute('aria-label', (labels[i] || '') + ' ' + k);

      var dayKey = document.createElement('span');
      dayKey.className = 'p-day-k';
      dayKey.textContent = labels[i] || String(i);

      var dot = document.createElement('span');
      dot.className = 'p-day-dot';
      if (done) dot.innerHTML = CHECK_SVG;
      else dot.textContent = String(d.getDate());

      btn.appendChild(dayKey);
      btn.appendChild(dot);
      el.weekStrip.appendChild(btn);
    }
  }

  function renderHistory() {
    var list = readJSON(HISTORY_KEY, []);
    if (!el.historyList) return;
    el.historyList.textContent = '';

    if (!list.length) {
      el.historyEmpty.hidden = false;
      return;
    }
    el.historyEmpty.hidden = true;

    list.forEach(function (item) {
      var li = document.createElement('li');

      var meta = document.createElement('div');
      var title = document.createElement('div');
      title.className = 'p-hist-title';
      title.textContent = item.title || '';
      var time = document.createElement('div');
      time.className = 'p-hist-time';
      time.textContent = formatTime(item.ts);
      meta.appendChild(title);
      meta.appendChild(time);

      var delta = document.createElement('span');
      delta.className = 'p-hist-delta';
      delta.textContent = '+' + Number(item.delta || 0);

      li.appendChild(meta);
      li.appendChild(delta);
      el.historyList.appendChild(li);
    });
  }

  function formatTime(ts) {
    var d = new Date(ts);
    try {
      return d.toLocaleDateString(lang(), { month: 'numeric', day: 'numeric' })
        + ' ' + d.toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return keyOf(d);
    }
  }

  function renderAll() {
    renderIdentity();
    renderFacts();
    renderPoints();
    renderCheckinBtn();
    renderWeek();
    renderHistory();
    buildSelects();
  }

  /* =========================================================
     抽屉菜单（与命数页一致）
     ========================================================= */
  function setDrawer(open) {
    el.burger.classList.toggle('is-open', open);
    el.burger.setAttribute('aria-expanded', String(open));
    el.drawer.hidden = !open;
    el.scrim.hidden = !open;
  }
  if (el.burger) el.burger.addEventListener('click', function () { setDrawer(el.drawer.hidden); });
  if (el.scrim) el.scrim.addEventListener('click', function () { setDrawer(false); });
  if (el.drawerClose) el.drawerClose.addEventListener('click', function () { setDrawer(false); });
  if (el.drawer) {
    el.drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
  }

  /* =========================================================
     底部弹层（编辑资料 / 积分记录）
     ========================================================= */
  var sheetTimer = null;

  function openSheet(node) {
    if (!node) return;
    if (sheetTimer) { window.clearTimeout(sheetTimer); sheetTimer = null; }
    el.sheetMask.hidden = false;
    node.hidden = false;
    document.body.classList.add('is-locked');
    window.requestAnimationFrame(function () {
      el.sheetMask.classList.add('show');
      node.classList.add('open');
    });
  }

  function closeSheets() {
    var opened = [el.editSheet, el.historySheet].filter(function (n) { return n && !n.hidden; });
    if (!opened.length) return;
    el.sheetMask.classList.remove('show');
    opened.forEach(function (n) { n.classList.remove('open'); });
    document.body.classList.remove('is-locked');
    if (sheetTimer) window.clearTimeout(sheetTimer);
    sheetTimer = window.setTimeout(function () {
      sheetTimer = null;
      opened.forEach(function (n) { n.hidden = true; });
      el.sheetMask.hidden = true;
    }, 280);
  }

  if (el.sheetMask) el.sheetMask.addEventListener('click', closeSheets);
  if (el.editCancel) el.editCancel.addEventListener('click', closeSheets);
  if (el.historyCancel) el.historyCancel.addEventListener('click', closeSheets);

  /* =========================================================
     编辑资料：选项数据（随语言重建）
     ========================================================= */
  var YEAR_ITEMS = [], MONTH_ITEMS = [], DAY_ITEMS = [], HOUR_ITEMS = [], GENDER_ITEMS = [];
  var draft = { year: '', month: '', day: '', hour: '', unknown: false, gender: '' };

  function makeOpt(sel, value, label, hiddenPh) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    if (hiddenPh) o.hidden = true;
    sel.appendChild(o);
  }
  function fillSelect(sel, items, phLabel) {
    if (!sel) return;
    sel.textContent = '';
    makeOpt(sel, '', phLabel || '', true);
    items.forEach(function (it) { makeOpt(sel, String(it.value), it.label); });
  }

  function buildSelects() {
    YEAR_ITEMS = [];
    MONTH_ITEMS = [];
    DAY_ITEMS = [];
    HOUR_ITEMS = [];
    GENDER_ITEMS = [
      { value: 'male', label: t('genderMale') },
      { value: 'female', label: t('genderFemale') }
    ];

    var yEnd = new Date().getFullYear();
    for (var y = yEnd; y >= 1940; y--) YEAR_ITEMS.push({ value: String(y), label: String(y) });
    for (var m = 1; m <= 12; m++) MONTH_ITEMS.push({ value: String(m), label: String(m) });
    for (var d = 1; d <= 31; d++) DAY_ITEMS.push({ value: String(d), label: String(d) });
    for (var h = 0; h < 24; h++) HOUR_ITEMS.push({ value: String(h), label: pad2(h) + ':00' });

    fillSelect(el.editYear, YEAR_ITEMS, t('phYear'));
    fillSelect(el.editMonth, MONTH_ITEMS, t('phMonth'));
    fillSelect(el.editDay, DAY_ITEMS, t('phDay'));
    fillSelect(el.editHour, HOUR_ITEMS, t('phHour'));
    fillSelect(el.editGender, GENDER_ITEMS, t('phGender'));

    el.editYear.value = draft.year;
    el.editMonth.value = draft.month;
    el.editDay.value = draft.day;
    el.editHour.value = draft.hour;
    el.editGender.value = draft.gender;
    syncTriggers();
  }

  function syncDateText() {
    if (!el.dateTriggerText) return;
    var y = el.editYear.value, m = el.editMonth.value, d = el.editDay.value;
    el.dateTriggerText.textContent = (!y || !m || !d)
      ? t('labelBirth')
      : (isZh() ? y + ' 年 ' + Number(m) + ' 月 ' + Number(d) + ' 日' : y + ' / ' + m + ' / ' + d);
  }
  function syncHourText() {
    if (!el.hourTriggerText) return;
    var item = null;
    for (var i = 0; i < HOUR_ITEMS.length; i++) {
      if (HOUR_ITEMS[i].value === el.editHour.value) { item = HOUR_ITEMS[i]; break; }
    }
    el.hourTriggerText.textContent = (el.unknownTime.checked || !item) ? t('phHour') : item.label;
  }
  function syncGenderText() {
    if (!el.genderTriggerText) return;
    var v = el.editGender.value;
    el.genderTriggerText.textContent = v === 'male' ? t('genderMale')
      : v === 'female' ? t('genderFemale') : t('phGender');
  }
  function syncTriggers() { syncDateText(); syncHourText(); syncGenderText(); }

  function openEdit(field) {
    var u = userData() || {};
    draft.year = u.year ? String(u.year) : '';
    draft.month = u.month ? String(u.month) : '';
    draft.day = u.day ? String(u.day) : '';
    draft.hour = (u.hour == null || u.hour === '') ? '' : String(u.hour);
    draft.unknown = !!u.unknown;
    draft.gender = u.gender || '';

    el.unknownTime.checked = draft.unknown;
    buildSelects();
    applyUnknownState();

    if (el.editError) el.editError.hidden = true;
    openSheet(el.editSheet);

    /* 从具体某一行进入 → 直接打开对应滚轮，少一步操作 */
    if (field) {
      window.setTimeout(function () {
        if (el.editSheet.hidden) return;
        if (field === 'birth') openPicker(t('labelBirth'), dateColumns());
        else if (field === 'time' && !draft.unknown) openPicker(t('labelTime'), hourColumns());
        else if (field === 'gender') openPicker(t('labelGender'), genderColumns());
      }, 320);
    }
  }

  function applyUnknownState() {
    el.editHour.disabled = el.unknownTime.checked;
    el.hourTrigger.disabled = el.unknownTime.checked;
    syncHourText();
  }

  function showEditError(msg) {
    if (!el.editError) return;
    el.editError.textContent = msg;
    el.editError.hidden = false;
  }

  function saveEdit() {
    if (!el.editYear.value || !el.editMonth.value || !el.editDay.value) {
      showEditError(t('profileNeedBirth'));
      return;
    }
    if (!el.unknownTime.checked && !el.editHour.value) {
      showEditError(t('profileNeedBirth'));
      return;
    }

    var prev = userData() || {};
    var next = {
      year: el.editYear.value,
      month: el.editMonth.value,
      day: el.editDay.value,
      unknown: el.unknownTime.checked,
      hour: el.unknownTime.checked ? null : el.editHour.value,
      gender: el.editGender.value || null
    };
    Object.keys(prev).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(next, k)) return;
      next[k] = prev[k];
    });

    window.YiNumUser.saveUserData(next);
    /* 生辰变化 → 清掉已缓存的命数结果，下次进入重新推演（保持数据一致） */
    var acct = window.YiNumUser.getAccountId ? window.YiNumUser.getAccountId() : 'anon';
    lsDel('yinum.destiny.result:' + acct);

    closeSheets();
    renderFacts();
    toast(t('profileSaved'));
  }

  if (el.editSave) el.editSave.addEventListener('click', saveEdit);
  if (el.unknownTime) {
    el.unknownTime.addEventListener('change', function () {
      draft.unknown = el.unknownTime.checked;
      applyUnknownState();
    });
  }
  if (el.editTrigger) el.editTrigger.addEventListener('click', function () { openEdit(); });
  Array.prototype.forEach.call(document.querySelectorAll('.p-fact'), function (row) {
    row.addEventListener('click', function () { openEdit(row.getAttribute('data-edit-field')); });
  });

  /* =========================================================
     通用底部滚轮（与命数页交互一致）
     ========================================================= */
  var activeCols = [];
  var pickerTimer = null;

  function centerRow(col, row) {
    var cr = col.getBoundingClientRect();
    var rr = row.getBoundingClientRect();
    col.scrollTop += (rr.top + rr.height / 2) - (cr.top + cr.height / 2);
  }

  function buildColumn(items, currentValue, onSelect) {
    var col = document.createElement('div');
    col.className = 'picker-col';

    items.forEach(function (it) {
      var r = document.createElement('button');
      r.type = 'button';
      r.className = 'picker-row';
      r.textContent = it.label;
      r.dataset.value = String(it.value);
      r.addEventListener('click', function () { centerRow(col, r); onSelect(String(it.value)); });
      col.appendChild(r);
    });
    var rows = Array.prototype.slice.call(col.children);
    el.pickerCols.appendChild(col);

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

    function mark(value) {
      rows.forEach(function (r) { r.classList.toggle('active', r.dataset.value === String(value)); });
    }
    function center(value) {
      var target = null;
      rows.forEach(function (r) { if (r.dataset.value === String(value)) target = r; });
      if (target) centerRow(col, target);
    }
    mark(currentValue);
    return { mark: mark, center: center };
  }

  function openPicker(title, columns) {
    if (!el.pickerSheet) return;
    if (pickerTimer) { window.clearTimeout(pickerTimer); pickerTimer = null; }
    el.pickerTitle.textContent = title;
    el.pickerCols.textContent = '';

    var hasUnit = columns.length > 1 && columns.some(function (c) { return !!c.unit; });
    el.pickerUnits.textContent = '';
    el.pickerUnits.hidden = !hasUnit;
    if (hasUnit) {
      columns.forEach(function (c) {
        var u = document.createElement('span');
        u.className = 'picker-unit';
        u.textContent = c.unit || '';
        el.pickerUnits.appendChild(u);
      });
    }

    activeCols = columns.map(function (c, i) {
      return buildColumn(c.items, c.value, function (v) {
        c.onSelect(v);
        if (activeCols[i]) activeCols[i].mark(v);
      });
    });

    el.pickerMask.hidden = false;
    el.pickerSheet.hidden = false;
    document.body.classList.add('is-locked');
    window.requestAnimationFrame(function () {
      el.pickerMask.classList.add('show');
      el.pickerSheet.classList.add('open');
      activeCols.forEach(function (col, i) { col.center(columns[i].value); });
    });
  }

  function closePicker() {
    if (!el.pickerSheet || el.pickerSheet.hidden) return;
    el.pickerMask.classList.remove('show');
    el.pickerSheet.classList.remove('open');
    if (!el.editSheet.hidden || !el.historySheet.hidden) document.body.classList.add('is-locked');
    else document.body.classList.remove('is-locked');
    if (pickerTimer) window.clearTimeout(pickerTimer);
    pickerTimer = window.setTimeout(function () {
      pickerTimer = null;
      el.pickerMask.hidden = true;
      el.pickerSheet.hidden = true;
      el.pickerCols.textContent = '';
      activeCols = [];
    }, 280);
  }

  function dateColumns() {
    return [
      { unit: t('phYear'), items: YEAR_ITEMS, value: el.editYear.value,
        onSelect: function (v) { el.editYear.value = v; syncDateText(); } },
      { unit: t('phMonth'), items: MONTH_ITEMS, value: el.editMonth.value,
        onSelect: function (v) { el.editMonth.value = v; syncDateText(); } },
      { unit: t('phDay'), items: DAY_ITEMS, value: el.editDay.value,
        onSelect: function (v) { el.editDay.value = v; syncDateText(); } }
    ];
  }
  function hourColumns() {
    return [{ items: HOUR_ITEMS, value: el.editHour.value,
      onSelect: function (v) { el.editHour.value = v; syncHourText(); } }];
  }
  function genderColumns() {
    return [{ items: GENDER_ITEMS, value: el.editGender.value,
      onSelect: function (v) { el.editGender.value = v; syncGenderText(); } }];
  }

  if (el.dateTrigger) el.dateTrigger.addEventListener('click', function () { openPicker(t('labelBirth'), dateColumns()); });
  if (el.hourTrigger) el.hourTrigger.addEventListener('click', function () {
    if (el.unknownTime.checked) return;
    openPicker(t('labelTime'), hourColumns());
  });
  if (el.genderTrigger) el.genderTrigger.addEventListener('click', function () { openPicker(t('labelGender'), genderColumns()); });

  if (el.pickerMask) el.pickerMask.addEventListener('click', closePicker);
  if (el.pickerCancel) el.pickerCancel.addEventListener('click', closePicker);
  if (el.pickerConfirm) el.pickerConfirm.addEventListener('click', closePicker);

  /* =========================================================
     积分卡片交互
     ========================================================= */
  if (el.checkinBtn) el.checkinBtn.addEventListener('click', doCheckin);
  if (el.historyBtn) el.historyBtn.addEventListener('click', function () {
    renderHistory();
    openSheet(el.historySheet);
  });
  if (el.weekStrip) {
    el.weekStrip.addEventListener('click', function (e) {
      var btn = e.target.closest('.p-day');
      if (!btn || btn.disabled) return;
      var k = btn.getAttribute('data-date');
      if (isChecked(k)) { toast(t('profileCheckinDone')); return; }
      doCheckin();
    });
  }
  if (el.avatarBtn) el.avatarBtn.addEventListener('click', function () {
    toast(t('profileAvatarPending'));   /* 预留上传入口：此处接入图片选择与裁剪 */
  });

  /* =========================================================
     退出登录
     ========================================================= */
  if (el.signoutBtn) {
    el.signoutBtn.addEventListener('click', function () {
      var account = currentAccount();
      if (!account) { window.location.href = 'login.html'; return; }
      var done = function () {
        renderIdentity();
        toast(t('profileSignOutDone'));
        window.setTimeout(function () { window.location.href = 'index.html'; }, 320);
      };
      if (window.YiNumAuth && window.YiNumAuth.signOut) {
        window.YiNumAuth.signOut().then(done).catch(done);
      } else {
        lsDel('yinum.auth');
        done();
      }
    });
  }

  /* =========================================================
     键盘 / 初始化
     ========================================================= */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (el.drawer && !el.drawer.hidden) { setDrawer(false); return; }
    if (el.pickerSheet && !el.pickerSheet.hidden) { closePicker(); return; }
    closeSheets();
  });

  if (window.YiNumI18n) window.YiNumI18n.init(renderAll);
  renderAll();
})();
