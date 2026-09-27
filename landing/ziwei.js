/* =========================================================
   Yi-Num · 紫微斗数（启动页 ZiWeiPage）

   启动页（ziwei.html）：
     1. 进入时若当天已有结果（ziweiDaily_YYYY-MM-DD）→ 直接跳转结果页
     2. 无结果：
        - 已有出生信息 → 按钮「发起算卦」→ 点击后加载 → 请求 → 保存 → 跳结果页
        - 无出生信息   → 按钮「完善个人信息」→ 弹底部表单 → 保存后按钮变「发起算卦」
     3. 出生信息与【命数】共用（window.YiNumUser）
   结果页见 ziwei-result.html
   ========================================================= */
(function () {
  'use strict';

  var Z = window.YiNumZiwei;

  /* ---------- 视图元素 ---------- */
  var elStart = document.getElementById('zwStart');        // 启动页卡片
  var elLoading = document.getElementById('zwLoading');
  var startBtn = document.getElementById('zwStartBtn');

  /* ---------- 模态框元素 ---------- */
  var modalMask = document.getElementById('zwModalMask');
  var modal = document.getElementById('zwModal');
  var modalCancel = document.getElementById('zwModalCancel');
  var modalSave = document.getElementById('zwModalSave');
  var yearSel = document.getElementById('zwYear');
  var monthSel = document.getElementById('zwMonth');
  var daySel = document.getElementById('zwDay');
  var hourSel = document.getElementById('zwHour');
  var unknownCb = document.getElementById('zwUnknown');

  var busy = false;                     // 请求锁，防止重复点击
  var today = new Date();

  function t(k) { return window.YiNumI18n ? window.YiNumI18n.t(k) : k; }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function getUser() { return window.YiNumUser ? window.YiNumUser.getUserData() : null; }
  function hasBirthInfo() {
    var u = getUser();
    return !!(u && u.year && u.month && u.day);
  }

  function showLoading(on) { if (elLoading) elLoading.hidden = !on; }
  function goResult() { location.replace('ziwei-result.html'); }

  /* ---------- 启动按钮：随出生信息状态切换文案 ---------- */
  function updateLaunchBtn() {
    if (!startBtn) return;
    startBtn.textContent = hasBirthInfo() ? t('ziweiStartBtn') : t('ziweiFillBtn');
  }

  /* ---------- 信息填写模态框 ---------- */
  function makeOpt(value, label) {
    var o = document.createElement('option');
    o.value = value; o.textContent = label;
    return o;
  }
  function addPlaceholder(sel, text) {
    var o = makeOpt('', text);
    o.hidden = true;
    sel.appendChild(o);
    return o;
  }
  function buildFormOptions() {
    var yEnd = new Date().getFullYear();
    addPlaceholder(yearSel, t('phYear'));
    for (var y = yEnd; y >= 1940; y--) yearSel.appendChild(makeOpt(String(y), String(y)));
    addPlaceholder(monthSel, t('phMonth'));
    for (var m = 1; m <= 12; m++) monthSel.appendChild(makeOpt(String(m), String(m)));
    addPlaceholder(daySel, t('phDay'));
    for (var d = 1; d <= 31; d++) daySel.appendChild(makeOpt(String(d), String(d)));
    addPlaceholder(hourSel, t('phHour'));
    for (var h = 0; h < 24; h++) hourSel.appendChild(makeOpt(String(h), pad2(h) + ':00'));
  }
  function syncHourState() {
    if (hourSel) hourSel.disabled = !!(unknownCb && unknownCb.checked);
  }
  function prefillForm() {
    var u = getUser() || {};
    if (u.year) yearSel.value = u.year;
    if (u.month) monthSel.value = u.month;
    if (u.day) daySel.value = u.day;
    if (u.unknown) { if (unknownCb) unknownCb.checked = true; }
    else if (u.hour != null) hourSel.value = u.hour;
    var radios = document.querySelectorAll('input[name="zwGender"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = (r.value === u.gender); });
    syncHourState();
  }
  var closeTimer = null;
  function openModal() {
    if (!modal) return;
    if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = null; }
    prefillForm();
    modalMask.hidden = false; modal.hidden = false;
    requestAnimationFrame(function () {
      modalMask.classList.add('show'); modal.classList.add('open');
    });
  }
  function closeModal() {
    if (!modal) return;
    modalMask.classList.remove('show'); modal.classList.remove('open');
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      closeTimer = null;
      modalMask.hidden = true; modal.hidden = true;
    }, 280);
  }
  function saveForm() {
    var y = yearSel.value, m = monthSel.value, d = daySel.value;
    if (!y || !m || !d) { if (Z) Z.showToast(t('formError')); return; }
    var unknown = !!(unknownCb && unknownCb.checked);
    if (!unknown && hourSel.value === '') { if (Z) Z.showToast(t('formError')); return; }
    var gender = '';
    var radios = document.querySelectorAll('input[name="zwGender"]');
    Array.prototype.forEach.call(radios, function (r) { if (r.checked) gender = r.value; });
    if (window.YiNumUser) {
      window.YiNumUser.saveUserData({
        year: y, month: m, day: d,
        unknown: unknown,
        hour: unknown ? null : hourSel.value,
        gender: gender || null
      });
    }
    closeModal();
    updateLaunchBtn();
  }

  /* ---------- 发起算卦 → 请求 → 保存 → 跳转结果页 ---------- */
  function run() {
    if (!Z || busy) return;
    var birth = getUser();
    if (!hasBirthInfo()) { updateLaunchBtn(); return; }
    busy = true;
    showLoading(true);
    Z.fetchZiweiDaily(birth, today).then(function (data) {
      Z.saveResult(today, data);          // 缓存 ziweiDaily_YYYY-MM-DD
      goResult();
    }).catch(function () {
      Z.showToast(t('deriveFailed'));
      busy = false; showLoading(false);
    });
  }

  /* ---------- 初始化：已推演则直跳结果页 ---------- */
  function initView() {
    var cached = Z ? Z.getResult(today) : null;
    if (cached) { goResult(); return; }
    if (elStart) elStart.hidden = false;
    updateLaunchBtn();
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        if (busy) return;
        if (hasBirthInfo()) run(); else openModal();
      });
    }
    if (unknownCb) unknownCb.addEventListener('change', syncHourState);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalMask) modalMask.addEventListener('click', closeModal);
    if (modalSave) modalSave.addEventListener('click', saveForm);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    if (window.YiNumI18n) {
      window.YiNumI18n.init(function () { updateLaunchBtn(); syncHourState(); });
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

  buildFormOptions();
  bindEvents();
  initView();
})();
