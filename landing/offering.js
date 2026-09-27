/* =========================================================
   Yi-Num · 供奉（OfferingPage）
   神像轮播 · 点香（1 小时冷却）· 点灯（时长券制）· 功德
   木鱼 / 禅乐 / 香谱 · 状态持久化（localStorage）
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     ① 神像配置（数组驱动，便于增删改）
     ======================================================= */
  var DEITIES = [
    {
      id: 'tianxiang',
      img: 'assets/deity-tianxiang.jpg',  /* 有图用图，无图走 SVG 占位 */
      relic: 'ruyi',
      accent: '#7FB2A6',
      type: { 'zh-CN': '平安', en: 'Peace', id: 'Keselamatan' },
      name: { 'zh-CN': '天相星君', en: 'Tianxiang Star Lord', id: 'Dewa Tianxiang' },
      intro: {
        'zh-CN': '护佑安康，消灾解厄。',
        en: 'Guarding health and peace, dissolving calamity and misfortune.',
        id: 'Melindungi keselamatan, menghapus bencana dan kesulitan.'
      }
    },
    {
      id: 'wuqu',
      img: 'assets/deity-wuqu.jpg',       /* 有图用图，无图走 SVG 占位 */
      relic: 'ingot',
      accent: '#D4AF37',
      type: { 'zh-CN': '财运', en: 'Wealth', id: 'Rezeki' },
      name: { 'zh-CN': '武曲星君', en: 'Wuqu Star Lord', id: 'Dewa Wuqu' },
      intro: {
        'zh-CN': '财源广进，富贵有余。',
        en: 'Wealth flows in from every side; honour and abundance remain.',
        id: 'Rezeki mengalir deras; kemuliaan dan kelimpahan berlimpah.'
      }
    },
    {
      id: 'hongluan',
      img: 'assets/deity-hongluan.jpg',   /* 有图用图，无图走 SVG 占位 */
      relic: 'thread',
      accent: '#E0637A',
      type: { 'zh-CN': '姻缘', en: 'Love', id: 'Asmara' },
      name: { 'zh-CN': '红鸾星君', en: 'Hongluan Star Lord', id: 'Dewa Hongluan' },
      intro: {
        'zh-CN': '月下老人，牵红线，结良缘。',
        en: 'The Old Man under the Moon — tying the red thread, joining good unions.',
        id: 'Dewa di bawah bulan — merangkai benang merah, menyatukan jodoh baik.'
      }
    }
  ];

  /* ---------- 占位神像：SVG 坐像（后续可替换为真实图片） ---------- */
  function relicSvg(kind) {
    if (kind === 'thread') {
      return '<path d="M76 146c9 12 39 12 48 0" fill="none" stroke="#E0637A" stroke-width="3" stroke-linecap="round"/>' +
             '<circle cx="100" cy="152" r="6" fill="#E0637A"/>' +
             '<path d="M100 158v10" stroke="#E0637A" stroke-width="2.4" stroke-linecap="round"/>';
    }
    if (kind === 'ruyi') {
      return '<path d="M100 132v26" stroke="#8FA9A0" stroke-width="4" stroke-linecap="round"/>' +
             '<path d="M92 132c-6-4-6-12 0-14s12 0 12 6" fill="none" stroke="#C9A96E" stroke-width="3" stroke-linecap="round"/>' +
             '<path d="M108 132c6-4 6-12 0-14s-12 0-12 6" fill="none" stroke="#C9A96E" stroke-width="3" stroke-linecap="round"/>';
    }
    /* ingot */
    return '<path d="M84 148c0-9 7-14 16-14s16 5 16 14c0 7-7 9-16 9s-16-2-16-9z" fill="#D4AF37"/>' +
           '<path d="M90 138c5-5 15-5 20 0" fill="none" stroke="#F6E4B8" stroke-width="2.4" stroke-linecap="round"/>';
  }

  function statueSvg(deity, i) {
    return '' +
      '<svg class="of-statue" viewBox="0 0 200 240" role="img" aria-hidden="true">' +
        '<defs>' +
          '<linearGradient id="ofBody' + i + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#F6E4B8"/>' +
            '<stop offset="45%" stop-color="#C9A96E"/>' +
            '<stop offset="100%" stop-color="#7A5C24"/>' +
          '</linearGradient>' +
          '<radialGradient id="ofHalo' + i + '" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="' + deity.accent + '" stop-opacity=".42"/>' +
            '<stop offset="100%" stop-color="' + deity.accent + '" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<circle class="of-statue-aura" cx="100" cy="108" r="86" fill="url(#ofHalo' + i + ')"/>' +
        '<ellipse cx="100" cy="224" rx="66" ry="9" fill="#1B1710"/>' +
        '<rect x="70" y="196" width="60" height="26" rx="6" fill="#2A2418"/>' +
        '<path d="M100 76c-24 0-40 17-42 40-2 21-7 38-12 52-4 12-6 22-6 28h120c0-6-2-16-6-28-5-14-10-31-12-52-2-23-18-40-42-40z" fill="url(#ofBody' + i + ')"/>' +
        '<path d="M84 78l16 18 16-18" fill="none" stroke="#6E5322" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="100" cy="60" r="23" fill="url(#ofBody' + i + ')"/>' +
        '<path d="M77 46c0-13 10-22 23-22s23 9 23 22c0 5-3 7-6 7H83c-3 0-6-2-6-7z" fill="#6E5322"/>' +
        '<circle cx="100" cy="24" r="4" fill="#D4AF37"/>' +
        '<circle cx="82" cy="152" r="7" fill="url(#ofBody' + i + ')"/>' +
        '<circle cx="118" cy="152" r="7" fill="url(#ofBody' + i + ')"/>' +
        relicSvg(deity.relic) +
      '</svg>';
  }

  /* =======================================================
     ② 常量与状态
     ======================================================= */
  var STORE_KEY   = 'yi-num:offering';
  var COOLDOWN_MS = 60 * 60 * 1000;          /* 点香冷却：1 小时 */
  var LAMP_OPTIONS = [30, 60, 90, 120];      /* 点灯时长（分钟） */
  var INIT_TICKETS = 3;                      /* 初始点灯券 */
  var INCENSE_MERIT = 1;                     /* 每炷香功德 */
  var UNIT_MS = 30 * 60 * 1000;              /* 每 30 分钟 1 点功德 */

  var state = loadState();
  var index = 0;                 /* 当前神像 */
  var lampChoice = LAMP_OPTIONS[0];

  function todayKey(d) {
    var t = d || new Date();
    return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
  }

  function defaults() {
    return {
      deities: {},               /* 每尊神像独立状态：{ lastIncenseAt, lamp } */
      tickets: INIT_TICKETS,
      merit: 0,
      meritDate: todayKey(),
      records: []
    };
  }

  function loadState() {
    var s = defaults();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          for (var k in saved) {
            if (Object.prototype.hasOwnProperty.call(saved, k)) s[k] = saved[k];
          }
        }
      }
    } catch (e) { /* 隐私模式 / 解析失败则用默认值 */ }

    /* 跨日：功德清零 */
    if (s.meritDate !== todayKey()) {
      s.merit = 0;
      s.meritDate = todayKey();
    }
    if (!Array.isArray(s.records)) s.records = [];
    if (!s.deities || typeof s.deities !== 'object') s.deities = {};

    /* 旧版数据迁移：原本全局共享的香 / 灯状态归入对应神像 */
    if (s.lastIncenseAt || s.lamp) {
      var incDeity = (s.records[0] && s.records[0].type === 'incense' && s.records[0].deityId) ||
                     (DEITIES[0] && DEITIES[0].id);
      if (s.lastIncenseAt) {
        if (!s.deities[incDeity]) s.deities[incDeity] = {};
        s.deities[incDeity].lastIncenseAt = s.lastIncenseAt;
      }
      if (s.lamp && s.lamp.deityId) {
        if (!s.deities[s.lamp.deityId]) s.deities[s.lamp.deityId] = {};
        s.deities[s.lamp.deityId].lamp = s.lamp;
      }
      delete s.lastIncenseAt;
      delete s.lamp;
    }
    return s;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
  }

  /* =======================================================
     ③ 工具函数
     ======================================================= */
  function t(key, vars) {
    return window.YiNumI18n ? window.YiNumI18n.t(key, vars) : key;
  }
  function lang() {
    return (window.YiNumI18n && window.YiNumI18n.getLang()) || 'zh-CN';
  }
  function pick(o) {
    if (!o) return '';
    return o[lang()] || o['zh-CN'] || '';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtClock(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return pad(m) + ':' + pad(s);
  }
  function fmtTime(ts) {
    var d = new Date(ts);
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'yi-toast';
      /* 挂到 .of-app 内：PC 端 toast 跟随手机外框，而非视口 */
      var host = document.getElementById('app') || document.body;
      host.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add('is-show'); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  /* =======================================================
     ④ DOM
     ======================================================= */
  var el = {
    track:    document.getElementById('ofTrack'),
    viewport: document.getElementById('ofViewport'),
    dots:     document.getElementById('ofDots'),
    prev:     document.getElementById('ofPrev'),
    next:     document.getElementById('ofNext'),
    name:     document.getElementById('ofDeityName'),
    tag:      document.getElementById('ofDeityTag'),
    intro:    document.getElementById('ofDeityIntro'),
    censer:   document.getElementById('ofCenser'),
    candleL:  document.getElementById('ofCandleL'),
    candleR:  document.getElementById('ofCandleR'),
    incenseBtn: document.getElementById('ofIncenseBtn'),
    incenseSub: document.getElementById('ofIncenseSub'),
    lampBtn:  document.getElementById('ofLampBtn'),
    lampSub:  document.getElementById('ofLampSub'),
    tickets:  document.getElementById('ofTickets'),
    meritNum: document.getElementById('ofMeritNum'),
    bar:      document.getElementById('ofBar'),
    timer:    document.getElementById('ofTimer'),
    timerTag: document.getElementById('ofTimerTag'),
    pause:    document.getElementById('ofPause'),
    pauseLabel: document.getElementById('ofPauseLabel'),
    scrim:    document.getElementById('ofScrim'),
    lampSheet: document.getElementById('ofLampSheet'),
    bookSheet: document.getElementById('ofBookSheet'),
    options:  document.getElementById('ofOptions'),
    records:  document.getElementById('ofRecords'),
    music:    document.getElementById('ofMusic'),
    muyu:     document.getElementById('ofMuyu'),
    book:     document.getElementById('ofBook'),
    debug:    document.getElementById('ofDebug'),
    reset:    document.getElementById('ofReset')
  };

  /* =======================================================
     ⑤ 神像轮播
     ======================================================= */
  function statueMarkup(d, i) {
    if (d.img) {
      return '<img class="of-statue of-statue--img" src="' + d.img + '" alt="" draggable="false">';
    }
    return statueSvg(d, i);
  }

  function renderSlides() {
    if (!el.track) return;
    el.track.innerHTML = DEITIES.map(function (d, i) {
      return '<div class="of-slide" data-index="' + i + '">' + statueMarkup(d, i) + '</div>';
    }).join('');

    if (el.dots) {
      el.dots.innerHTML = DEITIES.map(function (d, i) {
        return '<button class="of-dot" type="button" role="tab" data-index="' + i +
               '" aria-label="' + pick(d.name) + '"></button>';
      }).join('');
      el.dots.addEventListener('click', function (e) {
        var dot = e.target.closest('.of-dot');
        if (dot) go(parseInt(dot.getAttribute('data-index'), 10));
      });
    }
  }

  function go(i) {
    /* 夹紧范围，不再首尾循环 */
    index = Math.max(0, Math.min(DEITIES.length - 1, i));
    var offset = -index * 100;
    if (el.track) el.track.style.transform = 'translateX(' + offset + '%)';

    Array.prototype.forEach.call(el.track ? el.track.children : [], function (slide, si) {
      slide.classList.toggle('is-current', si === index);
    });
    if (el.dots) {
      Array.prototype.forEach.call(el.dots.children, function (dot, di) {
        dot.classList.toggle('is-active', di === index);
        dot.setAttribute('aria-selected', String(di === index));
      });
    }
    renderDeity();
    updateArrows();
  }

  /* 首图隐藏左箭头，末图隐藏右箭头 */
  function updateArrows() {
    if (el.prev) el.prev.classList.toggle('is-hidden', index === 0);
    if (el.next) el.next.classList.toggle('is-hidden', index === DEITIES.length - 1);
  }

  function renderDeity() {
    var d = DEITIES[index];
    if (!d) return;
    if (el.name) el.name.textContent = pick(d.name);
    if (el.tag) el.tag.textContent = pick(d.type);
    if (el.intro) el.intro.textContent = pick(d.intro);
  }

  /* 滑动切换（移动端） */
  function bindSwipe() {
    if (!el.viewport) return;
    var startX = 0, startY = 0, dragging = false, moved = false;

    el.viewport.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
    });

    el.viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
        moved = true;
        dragging = false;
        go(index + (dx < 0 ? 1 : -1));
      }
    });

    el.viewport.addEventListener('pointerup', function () { dragging = false; });
    el.viewport.addEventListener('pointercancel', function () { dragging = false; });
    el.viewport.addEventListener('click', function (e) {
      if (moved) { moved = false; e.preventDefault(); }
    });
  }

  /* =======================================================
     ⑥ 状态计算
     ======================================================= */
  /* 每尊神像独立的香 / 灯状态 */
  function deityState(id) {
    if (!state.deities[id]) state.deities[id] = { lastIncenseAt: 0, lamp: null };
    var ds = state.deities[id];
    if (typeof ds.lastIncenseAt !== 'number') ds.lastIncenseAt = 0;
    return ds;
  }
  function cur() { return deityState(DEITIES[index].id); }

  function incenseRemaining(ds) {
    ds = ds || cur();
    if (!ds.lastIncenseAt) return 0;
    return Math.max(0, COOLDOWN_MS - (Date.now() - ds.lastIncenseAt));
  }
  function incenseReady(ds) { return incenseRemaining(ds) === 0; }
  function incenseLit(ds) {
    ds = ds || cur();
    return !!ds.lastIncenseAt && incenseRemaining(ds) > 0;
  }

  function lampRemaining() {
    var l = cur().lamp;
    if (!l) return 0;
    if (l.paused) return Math.max(0, l.remainMs || 0);
    return Math.max(0, (l.endAt || 0) - Date.now());
  }
  function lampActive() { return !!cur().lamp; }

  /* =======================================================
     ⑦ 渲染
     ======================================================= */
  function renderMerit() {
    if (el.meritNum) el.meritNum.textContent = String(state.merit);
  }

  function renderTickets() {
    if (el.tickets) el.tickets.textContent = String(state.tickets);
  }

  function renderIncense() {
    if (el.censer) el.censer.classList.toggle('is-lit', incenseLit());
    if (!el.incenseBtn || !el.incenseSub) return;
    var left = incenseRemaining();
    if (incenseReady()) {
      el.incenseBtn.disabled = false;
      el.incenseSub.textContent = t('offeringIncenseReady');
    } else {
      el.incenseBtn.disabled = true;
      el.incenseSub.textContent = t('offeringNextIncense') + ' ' + fmtClock(left);
    }
  }

  function renderLamp() {
    var lamp = cur().lamp;
    var lit = !!lamp;
    if (el.candleL) el.candleL.classList.toggle('is-lit', lit && !lamp.paused);
    if (el.candleR) el.candleR.classList.toggle('is-lit', lit && !lamp.paused);
    if (!el.lampBtn || !el.lampSub) return;

    /* 点灯按钮副标题始终显示剩余点灯券，置于按钮内（替换原动态副标题） */
    el.lampBtn.disabled = lit || state.tickets <= 0;
    el.lampSub.textContent = t('offeringTicket') + '：' + state.tickets + ' ' + t('offeringTicketUnit');
  }

  function renderBar() {
    if (!el.bar) return;

    var lamp = cur().lamp;
    var lampMs = lampRemaining();
    var incMs = incenseRemaining();

    if (lamp) {
      el.bar.hidden = false;
      el.timer.textContent = fmtClock(lampMs);
      el.timerTag.textContent = t('offeringTimerLamp');
      el.pause.disabled = false;
      el.pauseLabel.textContent = lamp.paused ? t('offeringResume') : t('offeringPause');
    } else if (incMs > 0) {
      el.bar.hidden = false;
      el.timer.textContent = fmtClock(incMs);
      el.timerTag.textContent = t('offeringTimerIncense');
      el.pause.disabled = true;
      el.pauseLabel.textContent = t('offeringPause');
    } else {
      el.bar.hidden = true;
    }
  }

  function renderAll() {
    renderMerit();
    renderTickets();
    renderIncense();
    renderLamp();
    renderBar();
  }

  /* =======================================================
     ⑧ 点香
     ======================================================= */
  function lightIncense() {
    var ds = cur();
    if (!incenseReady(ds)) return;
    ds.lastIncenseAt = Date.now();
    state.merit += INCENSE_MERIT;
    state.records.unshift({
      type: 'incense',
      at: ds.lastIncenseAt,
      deityId: DEITIES[index].id,
      merit: INCENSE_MERIT
    });
    state.records = state.records.slice(0, 50);
    save();
    renderAll();
    toast(t('offeringIncenseDone'));
    muyu(0);   /* 敬香一声清磬 */
  }

  /* =======================================================
     ⑨ 点灯
     ======================================================= */
  function renderOptions() {
    if (!el.options) return;
    el.options.innerHTML = LAMP_OPTIONS.map(function (m) {
      var cost = Math.max(1, Math.round((m * 60 * 1000) / UNIT_MS));
      return '<button class="of-option' + (m === lampChoice ? ' is-active' : '') +
             '" type="button" data-min="' + m + '">' +
               t('offeringMinute', { m: m }) +
               '<small>' + t('offeringLampCost', { n: cost }) + '</small>' +
             '</button>';
    }).join('');
  }

  function bindOptions() {
    if (!el.options) return;
    el.options.addEventListener('click', function (e) {
      var btn = e.target.closest('.of-option');
      if (!btn) return;
      lampChoice = parseInt(btn.getAttribute('data-min'), 10) || LAMP_OPTIONS[0];
      Array.prototype.forEach.call(el.options.children, function (b) {
        b.classList.toggle('is-active', b === btn);
      });
    });
  }

  function lampCost(minutes) {
    return Math.max(1, Math.round((minutes * 60 * 1000) / UNIT_MS));
  }

  function startLamp() {
    var cost = lampCost(lampChoice);
    if (state.tickets < cost) {
      toast(t('offeringNoTicket'));
      return;
    }
    state.tickets -= cost;
    var durationMs = lampChoice * 60 * 1000;
    cur().lamp = {
      durationMs: durationMs,
      endAt: Date.now() + durationMs,
      remainMs: durationMs,
      paused: false,
      cost: cost,
      deityId: DEITIES[index].id,
      startedAt: Date.now()
    };
    save();
    closeSheets();
    renderAll();
    toast(t('offeringLampStarted', { m: lampChoice }));
  }

  function settleLamp(id, ds) {
    var l = ds.lamp;
    if (!l) return;
    var merit = Math.max(1, Math.round(l.durationMs / UNIT_MS));
    state.merit += merit;
    state.records.unshift({
      type: 'lamp',
      at: Date.now(),
      deityId: id,
      minutes: Math.round(l.durationMs / 60000),
      merit: merit
    });
    state.records = state.records.slice(0, 50);
    ds.lamp = null;
    save();
    renderAll();
    toast(t('offeringLampDone', { n: merit }));
  }

  function togglePause() {
    var ds = cur();
    var l = ds.lamp;
    if (!l) return;
    if (l.paused) {
      l.endAt = Date.now() + (l.remainMs || 0);
      l.paused = false;
    } else {
      l.remainMs = Math.max(0, (l.endAt || 0) - Date.now());
      l.paused = true;
    }
    save();
    renderAll();
  }

  /* 主循环：刷新倒计时 / 到期结算（含后台未展示的神像） */
  function tick() {
    var settled = false;
    Object.keys(state.deities).forEach(function (id) {
      var ds = state.deities[id];
      if (ds.lamp && !ds.lamp.paused && ((ds.lamp.endAt || 0) - Date.now()) <= 0) {
        settleLamp(id, ds);
        settled = true;
      }
    });
    if (settled) return;   /* settleLamp 内部已 renderAll */
    renderBar();
    renderIncense();
  }

  /* =======================================================
     ⑩ 弹窗
     ======================================================= */
  var openSheet = null;

  function showSheet(sheet) {
    if (!sheet || !el.scrim) return;
    el.scrim.hidden = false;
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    openSheet = sheet;
  }

  function closeSheets() {
    if (!el.scrim) return;
    [el.lampSheet, el.bookSheet].forEach(function (sheet) {
      if (!sheet || sheet.hidden) return;
      sheet.classList.remove('is-open');
      setTimeout(function () { sheet.hidden = true; }, 320);
    });
    setTimeout(function () { el.scrim.hidden = true; }, 320);
    openSheet = null;
  }

  function renderRecords() {
    if (!el.records) return;
    if (!state.records.length) {
      el.records.innerHTML = '<p class="of-records-empty">' + t('offeringRecordEmpty') + '</p>';
      return;
    }
    el.records.innerHTML = state.records.map(function (r) {
      var d = DEITIES.filter(function (x) { return x.id === r.deityId; })[0];
      var deityName = pick(d && d.name) || '';
      var label = r.type === 'lamp'
        ? t('offeringRecordLamp') + ' · ' + (r.minutes || 0) + '′'
        : t('offeringRecordIncense');
      return '<div class="of-record">' +
               '<span class="of-record-type">' + label + '</span>' +
               '<span class="of-record-meta">' + fmtTime(r.at) + ' · ' + deityName + '</span>' +
               '<span class="of-record-merit">+' + r.merit + '</span>' +
             '</div>';
    }).join('');
  }

  /* =======================================================
     ⑪ 声音（WebAudio 合成：禅乐 + 木鱼，无需外部音频文件）
     ======================================================= */
  var audioCtx = null;
  var drone = null;

  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function startDrone() {
    var ctx = audio();
    if (!ctx || drone) return;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2.2);

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;

    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.81;
    var o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = 220.5;

    /* 缓慢起伏，模拟呼吸感 */
    var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(gain.gain);

    o1.connect(filter); o2.connect(filter); o3.connect(filter);
    filter.connect(gain).connect(ctx.destination);
    o1.start(); o2.start(); o3.start(); lfo.start();

    drone = { o1: o1, o2: o2, o3: o3, lfo: lfo, gain: gain };
  }

  function stopDrone() {
    if (!drone || !audioCtx) return;
    var g = drone.gain;
    try {
      g.gain.cancelScheduledValues(audioCtx.currentTime);
      g.gain.setValueAtTime(g.gain.value || 0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
    } catch (e) { /* noop */ }
    var d = drone;
    drone = null;
    setTimeout(function () {
      [d.o1, d.o2, d.o3, d.lfo].forEach(function (o) { try { o.stop(); } catch (e) {} });
    }, 900);
  }

  function toggleMusic() {
    if (drone) {
      stopDrone();
      if (el.music) el.music.classList.remove('is-on');
    } else {
      var ctx = audio();
      if (!ctx) { toast(t('offeringNoAudio')); return; }
      startDrone();
      if (el.music) el.music.classList.add('is-on');
    }
  }

  /* 木鱼：短促的“咚”一声（噪声击打 + 低频下坠） */
  function muyu(delay) {
    var ctx = audio();
    if (!ctx) return;
    var start = ctx.currentTime + (delay || 0);

    var len = Math.floor(ctx.sampleRate * 0.09);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
    }
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 460; bp.Q.value = 2.6;
    var ng = ctx.createGain(); ng.gain.value = 0.32;
    src.connect(bp).connect(ng).connect(ctx.destination);
    src.start(start);

    var o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(240, start);
    o.frequency.exponentialRampToValueAtTime(88, start + 0.13);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.3, start);
    og.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    o.connect(og).connect(ctx.destination);
    o.start(start); o.stop(start + 0.2);
  }

  function knockMuyu() {
    muyu(0);
    if (!el.muyu) return;
    el.muyu.classList.remove('is-knock');
    void el.muyu.offsetWidth;
    el.muyu.classList.add('is-knock');
  }

  /* =======================================================
     ⑫ 事件绑定
     ======================================================= */
  function bindEvents() {
    if (el.prev) el.prev.addEventListener('click', function () { go(index - 1); });
    if (el.next) el.next.addEventListener('click', function () { go(index + 1); });

    if (el.incenseBtn) el.incenseBtn.addEventListener('click', lightIncense);

    if (el.lampBtn) {
      el.lampBtn.addEventListener('click', function () {
        if (lampActive()) return;
        if (state.tickets < lampCost(lampChoice)) {
          toast(t('offeringNoTicket'));
          return;
        }
        renderOptions();
        showSheet(el.lampSheet);
      });
    }

    var cancel = document.getElementById('ofLampCancel');
    if (cancel) cancel.addEventListener('click', closeSheets);
    var confirm = document.getElementById('ofLampConfirm');
    if (confirm) confirm.addEventListener('click', startLamp);

    var bookClose = document.getElementById('ofBookClose');
    if (bookClose) bookClose.addEventListener('click', closeSheets);

    if (el.scrim) el.scrim.addEventListener('click', closeSheets);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openSheet) closeSheets();
    });

    if (el.pause) el.pause.addEventListener('click', togglePause);

    if (el.music) el.music.addEventListener('click', toggleMusic);
    if (el.muyu) el.muyu.addEventListener('click', knockMuyu);
    if (el.book) {
      el.book.addEventListener('click', function () {
        renderRecords();
        showSheet(el.bookSheet);
      });
    }

    if (el.reset) {
      el.reset.addEventListener('click', function () {
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
        state = loadState();
        renderAll();
        toast(t('offeringResetDone'));
      });
    }

    /* 键盘左右切换（PC） */
    document.addEventListener('keydown', function (e) {
      if (openSheet) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });
  }

  /* ---------- 右侧抽屉菜单 ---------- */
  function bindDrawer() {
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

    var closeBtn = document.getElementById('drawerClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) setDrawer(false);
    });
  }

  /* =======================================================
     ⑬ 启动
     ======================================================= */
  function init() {
    renderSlides();
    go(0);
    bindSwipe();
    bindEvents();
    bindDrawer();
    renderOptions();
    bindOptions();
    renderAll();

    if (el.debug && /[?&]debug=1/.test(location.search)) el.debug.hidden = false;

    setInterval(tick, 250);

    /* 语言切换：重绘动态文案 */
    if (window.YiNumI18n) {
      window.YiNumI18n.init(function () {
        renderDeity();
        renderOptions();
        renderAll();
        if (el.bookSheet && !el.bookSheet.hidden) renderRecords();
      });
    }
  }

  init();
})();
