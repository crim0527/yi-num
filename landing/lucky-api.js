/* =========================================================
   Yi-Num · 吉时推演 API（DeepSeek）
   职责：
     1. 组装吉时 System Prompt 模板（河图洛书 / 洛河理数 / 十二时辰）
     2. 调用 DeepSeek /chat/completions（Bearer 鉴权 + 超时中断）
     3. 安全解析：stripMarkdown → 抽取 JSON → try/catch
     4. 结果按「日期」缓存到 LocalStorage；失败时回落演示数据
     5. 极简 Toast 提示

   鉴权方式：前端不再持有任何 Key，统一请求 Cloudflare Pages Function 代理
     （config.js 的 DEEPSEEK_API_BASE，默认 /api/deepseek），由代理端持有
     DeepSeek Key 并转发。本地调试可用：
       localStorage['yinum.debug.apiBase'] = '<worker-url>/api/deepseek'
   ========================================================= */
(function () {
  'use strict';

  /* 按账号隔离缓存：登录态用 uid，匿名态用设备 ID */
  function storeKey() {
    var acct = (window.YiNumUser && window.YiNumUser.getAccountId) ? window.YiNumUser.getAccountId() : 'anon';
    return 'yinum.lucky.result:' + acct;
  }

  /* ↓↓↓ 如需更换接口地址 / 模型 / 超时，改这里或 config.js ↓↓↓ */
  var API_BASE = (function () {
    try { var d = localStorage.getItem('yinum.debug.apiBase'); if (d) return d; } catch (e) {}
    return (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_API_BASE) || '/api/deepseek';
  })();
  var MODEL = (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_MODEL) || 'deepseek-chat';
  var USE_JSON_MODE = window.YiNumConfig && typeof window.YiNumConfig.DEEPSEEK_JSON_MODE === 'boolean'
    ? window.YiNumConfig.DEEPSEEK_JSON_MODE
    : true;
  var TIMEOUT_MS = (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_TIMEOUT_MS) || 60000;
  /* 代理槽位：lucky=吉时；对应 Worker 端 DEEPSEEK_API_KEY_LUCKY */
  var SLOT = 'lucky';

  var SYSTEM_ROLE = '你是精通河图洛书、洛河理数、易经八卦与四柱八字的国学命理大师。' +
    '请严格按用户给定的 JSON 结构输出，只输出纯净 JSON，不要包含 Markdown 代码块或任何解释文字。';

  /* 吉时推演 Prompt 模板（占位符：{{year}} {{month}} {{day}} {{time}} {{gender}} {{queryDate}}）
     注：{{queryDate}} 为「所求日期」，用于日期切换时按天重新推演 */
  var PROMPT_TEMPLATE = [
    '你是一位精通河图洛书、洛河理数、易经八卦与四柱八字的国学命理大师。你的任务是根据用户的出生信息，利用洛河理数的原理进行命理推演，并严格按照指定的 JSON 格式输出结果。',
    '',
    '【用户输入信息】',
    '出生日期：{{year}}年{{month}}月{{day}}日',
    '出生时间：{{time}}（如果用户选择了“不清楚”，则默认传入 12:00）',
    '性别：{{gender}}',
    '推演日期（所求日期）：{{queryDate}}',
    '',
    '【推演规则】',
    '1. 根据输入的年月日时，准确推算出四柱八字（天干地支）。',
    '2. 结合洛河理数（1-9数字与五行、八卦的对应关系）以及当天的天干地支，推算出该用户的“吉时”与“凶时”。',
    "3. 【吉时】需要包含：时间段（如 15:00 - 17:00）、标题（如 吉时）、详细批语（约50-100字，解释为何是吉时，结合五行生克原理，说明适合做什么）。",
    "4. 【凶时】需要包含：时间段（如 23:00 - 00:59、01:00 - 02:59）、标题（如 凶时）、详细批语（约50-100字，解释为何是凶时，说明需避忌的事项）。",
    '5. 时间段的划分需符合中国传统十二时辰（子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥），并转换为现代24小时制的时间段。',
    '',
    '【输出格式要求】',
    '必须严格输出纯净的 JSON 格式，不要包含任何 Markdown 代码块标记（如 ```json），不要包含任何额外的解释文字。',
    '',
    '【多语言输出要求】你必须在同一份 JSON 中，分别用三种语言输出全部文字内容：简体中文（zh-CN）、English（en）、Bahasa Indonesia（id）。',
    'JSON 顶层固定为 {"langs":{...}}，三种语言结构完全一致、字段名相同，仅文字不同：',
    '{',
    '  "langs": {',
    '    "zh-CN": {',
    '      "luckyTime": {',
    '        "period": "15:00 - 17:00",',
    '        "title": "吉时",',
    '        "comment": "五行完全契合：申时五行属金，是你的财星，能直接补益你命局所需，有助于增强财运和行动力；申中藏有壬水，是你的官星，代表事业与贵人，能带来双重助力。黄历…"',
    '      },',
    '      "unluckyTime": {',
    '        "period": "23:00 - 00:59 · 01:00 - 02:59",',
    '        "title": "凶时",',
    '        "comment": "当天的子时（23:00-00:59）为“日破”之时，诸事不宜，建议避开；丑时（01:00-02:59）宜静不宜动，诸事谨慎，同样建议避开。"',
    '      }',
    '    },',
    '    "en": { "/* 与 zh-CN 完全相同字段，内容为英文 */" },',
    '    "id": { "/* 与 zh-CN 完全相同字段，内容为印尼文 */" }',
    '  }',
    '}',
    '',
    '说明：三种语言的 period（时间段，如 "15:00 - 17:00"）保持一致，仅 title 与 comment 按各自语言输出。'
  ].join('\n');

  /* 兜底演示数据：请求失败 / 未配置 Key 时展示（含三语，与 langs 结构一致） */
  var FALLBACK = {
    isFallback: true,
    langs: {
      'zh-CN': {
        luckyTime: {
          period: '15:00 - 17:00',
          title: '吉时',
          comment: '五行完全契合：申时五行属金，是你的财星，能直接补益你命局所喜，有助于增强财运和行动力；申中藏有壬水，是你的官星，代表事业与贵人，能带来双重助力。黄历吉神加持：当天申时为“司命”吉星当值，是黄道吉时，适合祈福、求嗣、订婚、嫁娶、出行、求财、开市、交易、安床、赴任等事宜。'
        },
        unluckyTime: {
          period: '23:00 - 00:59 · 01:00 - 02:59',
          title: '凶时',
          comment: '当天的子时（23:00-00:59）为“日破”之时，诸事不宜，建议避开；丑时（01:00-02:59）宜静不宜动，诸事谨慎，同样建议避开。'
        }
      },
      'en': {
        luckyTime: {
          period: '15:00 - 17:00',
          title: 'Auspicious Hours',
          comment: "Shen hour (Metal) is your wealth star and its hidden Ren water is your career star, doubling its boost. The 'Siming' auspicious star guards this hour — a golden hour good for blessings, marriage, travel, wealth, business and more."
        },
        unluckyTime: {
          period: '23:00 - 00:59 · 01:00 - 02:59',
          title: 'Inauspicious Hours',
          comment: "Zi hour (23:00-00:59) is a 'day-breaking' time — avoid all important matters; Chou hour (01:00-02:59) is also inauspicious, so keep still and act with caution."
        }
      },
      'id': {
        luckyTime: {
          period: '15:00 - 17:00',
          title: 'Waktu Baik',
          comment: "Jam Shen (Logam) adalah bintang kekayaanmu dan Ren-air di dalamnya adalah bintang karier, memberi dorongan ganda. Bintang keberuntungan 'Siming' menjaga jam ini — jam baik untuk doa, pernikahan, bepergian, dan usaha."
        },
        unluckyTime: {
          period: '23:00 - 00:59 · 01:00 - 02:59',
          title: 'Waktu Buruk',
          comment: "Jam Zi (23:00-00:59) adalah waktu 'pemutus hari' — hindari urusan penting; jam Chou (01:00-02:59) juga tidak baik, diamlah dan berhati-hatilah."
        }
      }
    }
  };

  /* ---------------- 工具 ---------------- */


  function render(tpl, vars) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
    });
  }

  /* 「不清楚具体时间」或空值 → 默认 12:00；否则 HH:00 */
  function normalizeTime(info) {
    var h = Number(info && info.hour);
    if (!info || info.unknown || info.hour === null || info.hour === '' || isNaN(h)) return '12:00';
    return String(((h % 24) + 24) % 24).padStart(2, '0') + ':00';
  }

  function normalizeGender(g) {
    if (g === 'female') return '女';
    if (g === 'male') return '男';
    return '未说明';
  }

  /* 日期 → YYYY-MM-DD（同时用作缓存 key） */
  function formatDate(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) dt = new Date();
    var m = String(dt.getMonth() + 1).padStart(2, '0');
    var day = String(dt.getDate()).padStart(2, '0');
    return dt.getFullYear() + '-' + m + '-' + day;
  }

  /* 去除 Markdown 标记并截取 JSON 主体 */
  function stripMarkdown(text) {
    var s = String(text == null ? '' : text).trim();
    s = s.replace(/^\s*```(?:json|JSON)?\s*/, '');   // 开头代码块
    s = s.replace(/\s*```\s*$/, '');                  // 结尾代码块
    s = s.replace(/```(?:json|JSON)?/g, '');          // 残留标记
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    return s.trim();
  }

  /* 安全解析：失败返回 null，交由调用方走兜底 */
  function parseLuckyJSON(content) {
    try {
      return JSON.parse(stripMarkdown(content));
    } catch (e1) {
      try {
        // 二次尝试：中文引号、尾随逗号等脏数据
        var s = stripMarkdown(content)
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(s);
      } catch (e2) {
        return null;
      }
    }
  }

  /* 归一化单个语言块（zh-CN / en / id） */
  function normalizeLangBlock(rawLang) {
    if (!rawLang || typeof rawLang !== 'object') return null;
    var fb = FALLBACK.langs['zh-CN'];
    function block(src, fbb) {
      src = (src && typeof src === 'object') ? src : {};
      return {
        period: String(src.period || '').trim() || fbb.period,
        title: String(src.title || '').trim() || fbb.title,
        comment: String(src.comment || '').trim() || fbb.comment
      };
    }
    return {
      luckyTime: block(rawLang.luckyTime, fb.luckyTime),
      unluckyTime: block(rawLang.unluckyTime, fb.unluckyTime)
    };
  }

  /* 归一化：将 API 返回（含 langs.{zh-CN,en,id}）转换为统一结构；兼容旧版单语缓存 */
  function normalizeResult(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var src = raw.langs && typeof raw.langs === 'object' ? raw.langs : null;
    if (!src) {
      var single = normalizeLangBlock(raw);
      if (!single) return null;
      src = { 'zh-CN': single };
    }
    function pick(code) { return src[code] ? normalizeLangBlock(src[code]) : null; }
    var zh = pick('zh-CN') || pick('en') || pick('id') || normalizeLangBlock(FALLBACK.langs['zh-CN']);
    return {
      langs: { 'zh-CN': zh, 'en': pick('en') || zh, 'id': pick('id') || zh },
      isFallback: false,
      updatedAt: Date.now()
    };
  }

  /* ---------------- 缓存（按日期存放） ---------------- */
  function readAll() {
    try {
      var raw = localStorage.getItem(storeKey());
      var o = raw ? JSON.parse(raw) : null;
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function getResult(dateKey) {
    var v = readAll()[dateKey];
    return (v && (v.langs || v.luckyTime)) ? v : null;
  }
  function saveResult(dateKey, data) {
    var all = readAll();
    all[dateKey] = data;
    try { localStorage.setItem(storeKey(), JSON.stringify(all)); } catch (e) { /* 隐私模式静默 */ }
  }
  function clearResult() {
    try { localStorage.removeItem(storeKey()); } catch (e) { /* 静默 */ }
  }

  /* ---------------- Toast ---------------- */
  function showToast(msg, ms) {
    var el = document.getElementById('yiToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'yiToast';
      el.className = 'yi-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove('is-show');
    void el.offsetWidth;                 // 重触发过渡
    el.classList.add('is-show');
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(function () { el.classList.remove('is-show'); }, ms || 3200);
  }

  /* ---------------- 主流程 ---------------- */
  /**
   * 调用 DeepSeek 获取吉时 / 凶时推演数据
   * @param {{year:string,month:string,day:string,hour:string|null,unknown:boolean,gender:string}} birthInfo 出生信息（与命数页共用）
   * @param {Date|string} [queryDate] 所求日期，默认今天
   * @returns {Promise<Object>} 归一化后的推演结果；失败时 reject
   */
  async function fetchLuckyTimeData(birthInfo, queryDate) {

    var vars = {
      year: birthInfo.year,
      month: birthInfo.month,
      day: birthInfo.day,
      time: normalizeTime(birthInfo),       // 不清楚 → 12:00
      gender: normalizeGender(birthInfo.gender),
      queryDate: formatDate(queryDate || new Date())
    };
    var userPrompt = render(PROMPT_TEMPLATE, vars);

    var body = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_ROLE },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      stream: false
    };
    if (USE_JSON_MODE) body.response_format = { type: 'json_object' };

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller
      ? window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS)
      : null;

    try {
      var res = await fetch(API_BASE, {
        method: 'POST',
        signal: controller ? controller.signal : undefined,
        headers: {
          'Content-Type': 'application/json',
          'x-yinum-slot': SLOT
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        var detail = '';
        try { detail = (await res.text()).slice(0, 200); } catch (e) { /* ignore */ }
        var httpErr = new Error('HTTP ' + res.status + ' ' + detail);
        httpErr.code = 'HTTP_' + res.status;
        throw httpErr;
      }

      var json = await res.json();
      var content = json && json.choices && json.choices[0] && json.choices[0].message
        ? json.choices[0].message.content
        : '';
      var data = normalizeResult(parseLuckyJSON(content));
      if (!data) {
        var parseErr = new Error('BAD_JSON');
        parseErr.code = 'BAD_JSON';
        throw parseErr;
      }
      return data;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  window.YiNumLucky = {
    fetchLuckyTimeData: fetchLuckyTimeData,
    getResult: getResult,
    saveResult: saveResult,
    clearResult: clearResult,
    showToast: showToast,
    stripMarkdown: stripMarkdown,
    parseLuckyJSON: parseLuckyJSON,
    formatDate: formatDate,
    FALLBACK: FALLBACK,
    STORE_KEY: storeKey,
    pickLang: function (data, lang) {
      if (data && data.langs) {
        return data.langs[lang] || data.langs['zh-CN'] || data.langs['en'] || data.langs['id'] || null;
      }
      return data;   /* 旧版单语缓存（无 langs） */
    },
    hasApiKey: function () { return true; }
  };
})();
