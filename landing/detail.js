/* =========================================================
   Yi-Num · 命数详情（推演结果）
   语言切换 + 抽屉菜单（与首页一致） + 重新推演 → 返回输入页
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 抽屉菜单（与首页一致） ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');

  function setDrawer(open) {
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.hidden = !open;
    scrim.hidden = !open;
  }

  if (burger && drawer && scrim) {
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

  /* ---------- 四柱八字（干支推演，基于本地出生信息） ----------
     注：以公历日期直接推演（未做立春 / 节气与真太阳时校正），用于结果展示。 */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  /* 五虎遁·年上起月：甲己→丙、乙庚→戊、丙辛→庚、丁壬→壬、戊癸→甲 */
  var MONTH_START = [2, 4, 6, 8, 0];
  /* 五鼠遁·日上起时：甲己→甲、乙庚→丙、丙辛→戊、丁壬→庚、戊癸→壬 */
  var HOUR_START = [0, 2, 4, 6, 8];
  var MONTH_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  function t(k) { return window.YiNumI18n ? window.YiNumI18n.t(k) : k; }
  function mod(n, m) { return ((n % m) + m) % m; }
  function pillar(g, z) { return GAN[mod(g, 10)] + ZHI[mod(z, 12)]; }

  /* 日柱：公历日干支基数法，返回 60 甲子序（甲子 = 0） */
  function dayPillarIndex(y, m, d) {
    var yy = y % 100;
    var base = (y >= 2000)
      ? (yy + 7) * 5 + 15 + Math.floor((yy + 19) / 4)
      : (yy + 3) * 5 + 55 + Math.floor((yy - 1) / 4);
    var doy = d + MONTH_DAYS[m - 1];
    if (m > 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) doy += 1;
    var r = (base + doy) % 60;
    return r === 0 ? 59 : r - 1;
  }

  /* 返回 [年柱, 月柱, 日柱, 时柱]；时辰不明时最后一项为 null */
  function calcBazi(y, m, d, hour) {
    var yg = mod(y - 4, 10), yz = mod(y - 4, 12);          // 年柱
    var mg = mod(MONTH_START[mod(yg, 5)] + (m - 1), 10);    // 月柱（年上起月）
    var mz = mod(m + 1, 12);                                // 正月建寅
    var d60 = dayPillarIndex(y, m, d);
    var dg = d60 % 10, dz = d60 % 12;                       // 日柱
    var pillars = [pillar(yg, yz), pillar(mg, mz), pillar(dg, dz)];
    if (hour === null || hour === '' || isNaN(hour)) return pillars.concat([null]);
    var h = Number(hour) % 24;
    var hz = Math.floor(((h + 1) % 24) / 2);                 // 子时 23:00–01:00
    var hg = mod(HOUR_START[mod(dg, 5)] + hz, 10);           // 时柱（日上起时）
    return pillars.concat([pillar(hg, hz)]);
  }

  var D = window.YiNumDestiny;
  var fallbackNotified = false;

  /* 渲染八字标签：优先用 API 返回的 bazi，缺失时回退本地干支推算 */
  function renderBazi() {
    var list = document.getElementById('baziList');
    if (!list) return;
    var result = D ? D.getResult() : null;
    var pillars = (result && Array.isArray(result.bazi) && result.bazi.length) ? result.bazi : null;
    if (!pillars) {
      var data = window.YiNumUser ? window.YiNumUser.getUserData() : null;
      if (!data || !data.year || !data.month || !data.day) return;
      pillars = calcBazi(+data.year, +data.month, +data.day, data.unknown ? null : data.hour);
    }
    list.textContent = '';
    pillars.forEach(function (p) {
      var el = document.createElement('span');
      el.className = 'bazi-tag' + (p ? '' : ' is-unknown');
      el.textContent = p || t('baziUnknown');
      list.appendChild(el);
    });
  }

  /* 用推演结果覆盖文案，并摘掉 data-i18n，避免语言切换时译文写回覆盖真实结果 */
  function setText(id, value) {
    var el = document.getElementById(id);
    if (!el || !value) return;
    el.removeAttribute('data-i18n');
    el.textContent = value;
  }

  /* 渲染数字组小方框 */
  function renderNumbers(boxId, numbers) {
    var box = document.getElementById(boxId);
    if (!box || !numbers || !numbers.length) return;
    box.textContent = '';
    numbers.forEach(function (n) {
      var s = document.createElement('span');
      s.className = 'num-box';
      s.textContent = n;
      box.appendChild(s);
    });
    box.setAttribute('aria-label', numbers.join('、'));
  }

  /* 渲染：核心结论 / 详细批语 / 吉·中·凶 三组数字与批语（按当前语言选取语种块） */
  function renderResult() {
    var result = D ? D.getResult() : null;
    if (!result) return;
    var r = D.pickLang(result, window.YiNumI18n ? window.YiNumI18n.getLang() : 'zh-CN');
    if (!r) return;
    setText('fateConclusion', r.coreConclusion);
    setText('fateDetailText', r.detailedCommentary);
    renderNumbers('luckyNums', r.luckyNumbers && r.luckyNumbers.numbers);
    setText('luckyText', r.luckyNumbers && r.luckyNumbers.comment);
    renderNumbers('neutralNums', r.neutralNumbers && r.neutralNumbers.numbers);
    setText('neutralText', r.neutralNumbers && r.neutralNumbers.comment);
    renderNumbers('badNums', r.unluckyNumbers && r.unluckyNumbers.numbers);
    setText('badText', r.unluckyNumbers && r.unluckyNumbers.comment);

    /* 兜底演示数据：提示一次即可（语言切换会重复触发 renderAll） */
    if (result.isFallback && !fallbackNotified && D && D.showToast) {
      fallbackNotified = true;
      D.showToast(t('fallbackNote'));
    }
  }

  function renderAll() { renderBazi(); renderResult(); }

  /* ---------- 重新推演 → 返回输入页 ---------- */
  var reBtn = document.getElementById('reDerive');

  /**
   * 重新推演：返回录入页（?edit=1 表示带入已有数据修改，不触发自动跳转结果页）
   * 静态站点：window.location.href = 'destiny.html?edit=1'
   * React Router： navigate('/destiny?edit=1')
   */
  function goToInput() {
    /* 清空推演结果 → 回到录入页重推（表单会自动带入上次填写的出生信息） */
    if (D) D.clearResult();
    window.location.href = 'destiny.html?edit=1';
  }

  if (reBtn) reBtn.addEventListener('click', goToInput);

  /* ---------- 语言切换（全站共享）：初始化 + 语言变化时重绘八字 ---------- */
  if (window.YiNumI18n) window.YiNumI18n.init(renderAll);
  else renderAll();
})();
