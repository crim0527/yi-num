/* =========================================================
   Yi-Num · 紫微斗数「每日运势」API（DeepSeek）
   Prompt：采用官方提供的《紫微斗数prompt.txt》模板（占位符 {{year}} {{month}} {{day}} {{time}} {{gender}} {{currentDate}}）

   职责：
     1. 组装紫微斗数 System Prompt 模板
     2. 调用 DeepSeek /chat/completions（Bearer 鉴权 + 超时中断）
     3. 安全解析：stripMarkdown → 抽取 JSON → try/catch
     4. 结果按日期缓存到 LocalStorage（key: ziweiDaily_YYYY-MM-DD）
     5. 失败回落演示数据 + Toast 提示

   鉴权方式：前端不再持有任何 Key，统一请求 Cloudflare Pages Function 代理
     （config.js 的 DEEPSEEK_API_BASE，默认 /api/deepseek），由代理端持有
     DeepSeek Key 并转发。本地调试可用：
       localStorage['yinum.debug.apiBase'] = '<worker-url>/api/deepseek'
   ========================================================= */
(function () {
  'use strict';

  var STORE_PREFIX = 'ziweiDaily_';

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
  /* 代理槽位：ziwei=紫微斗数；对应 Worker 端 DEEPSEEK_API_KEY_ZIWEI */
  var SLOT = 'ziwei';

  var SYSTEM_ROLE = '你是精通紫微斗数、易经八卦与四柱八字的国学命理大师。' +
    '请严格按用户给定的 JSON 结构输出，只输出纯净 JSON，不要包含 Markdown 代码块或任何解释文字。';

  /* ---------- 官方 Prompt 模板（紫微斗数prompt.txt） ---------- */
  var PROMPT_TEMPLATE = [
    '你是一位精通紫微斗数、易经八卦与四柱八字的国学命理大师。你的任务是根据用户的出生信息和当前日期，利用紫微斗数原理推演当日运势，并严格按照指定的 JSON 格式输出结果。',
    '',
    '【用户输入信息】',
    '出生日期：{{year}}年{{month}}月{{day}}日',
    '出生时间：{{time}}（如果用户选择了“不清楚”，则默认传入 12:00）',
    '性别：{{gender}}',
    '当前日期：{{currentDate}}',
    '',
    '【推演规则】',
    '1. 根据用户出生信息排布紫微斗数命盘，结合当前日期流日、流时，推演当日运势。',
    '2. 运势内容需包含：整体运势、事业、财运、感情、健康、幸运色、幸运数字、宜、忌。',
    '3. 整体运势需用一句话概括（如“今日紫微星入命，贵人运强，宜主动出击”）。',
    '4. 各分项运势需给出简短批语（每项 30-50 字），结合紫微斗数星曜特性说明。',
    '5. 幸运色和幸运数字各给出 1-2 个，并简述原因。',
    '6. 宜、忌各列出 2-3 项，简洁明了。',
    '',
    '【输出格式要求】',
    '必须严格输出纯净的 JSON 格式，不要包含任何 Markdown 代码块标记（如 ```json），不要包含任何额外解释文字。',
    '',
    '【多语言输出要求】你必须在同一份 JSON 中，分别用三种语言输出全部文字内容：简体中文（zh-CN）、English（en）、Bahasa Indonesia（id）。',
    'JSON 顶层固定为 {"langs":{...}}，三种语言结构完全一致、字段名相同，仅文字不同：',
    '{',
    '  "langs": {',
    '    "zh-CN": {',
    '      "overall": "今日紫微星入命，贵人运强，宜主动出击。",',
    '      "career": "事业宫得左辅右弼加持，工作中有贵人相助，适合推进重要项目。",',
    '      "wealth": "财帛宫逢禄存，正财稳定，偏财有小惊喜，可适当关注投资机会。",',
    '      "love": "夫妻宫见红鸾星动，单身者易遇良缘，有伴侣者感情升温。",',
    '      "health": "疾厄宫平稳，注意脾胃保养，饮食宜清淡。",',
    '      "luckyColor": { "name": "紫色", "hex": "#6B4E9B" },',
    '      "luckyNumbers": ["3", "8"],',
    '      "suitable": ["签约", "出行", "会友"],',
    '      "avoid": ["争执", "熬夜", "大额消费"]',
    '    },',
    '    "en": { "/* 与 zh-CN 完全相同字段，内容为英文 */" },',
    '    "id": { "/* 与 zh-CN 完全相同字段，内容为印尼文 */" }',
    '  }',
    '}',
    '',
    '说明：三种语言的幸运色在每个语言下都给出 { "name": "<该语言的颜色名>", "hex": "<有效的 CSS 十六进制颜色, 如 #6B4E9B>" }；幸运数字与宜/忌列表三种语言分别对应各自语言。'
  ].join('\n');

  /* 兜底演示数据：请求失败 / 未配置 Key 时展示（含三语，与 langs 结构一致） */
  var FALLBACK = {
    isFallback: true,
    langs: {
      'zh-CN': {
        overall: '今日紫微星入命，贵人运强，宜主动出击。',
        career: '事业宫得左辅右弼加持，工作中有贵人相助，适合推进重要项目。',
        wealth: '财帛宫逢禄存，正财稳定，偏财有小惊喜，可适当关注投资机会。',
        love: '夫妻宫见红鸾星动，单身者易遇良缘，有伴侣者感情升温。',
        health: '疾厄宫平稳，注意脾胃保养，饮食宜清淡。',
        luckyColor: { name: '紫色', hex: '#6B4E9B' },
        luckyNumbers: ['3', '8'],
        suitable: ['签约', '出行', '会友'],
        avoid: ['争执', '熬夜', '大额消费']
      },
      'en': {
        overall: 'Purple star enters your fate today; noble support is strong — take the initiative.',
        career: 'Your career palace is blessed by Zuofu and Youbi; expect help from benefactors at work — a good time to advance key projects.',
        wealth: 'Your wealth palace meets Lucun; regular income is steady with small windfalls — keep an eye on investment opportunities.',
        love: 'The red phoenix star stirs your marriage palace; singles may meet a fated partner, and couples grow closer.',
        health: 'Your health palace is stable; care for your stomach and spleen, and keep meals light.',
        luckyColor: { name: 'Purple', hex: '#6B4E9B' },
        luckyNumbers: ['3', '8'],
        suitable: ['Sign contracts', 'Travel', 'Meet friends'],
        avoid: ['Conflict', 'Staying up late', 'Large spending']
      },
      'id': {
        overall: 'Bintang ungu masuk nasib Anda hari ini; bantuan mulia kuat — ambil inisiatif.',
        career: 'Istana karier Anda diberkati Zuofu dan Youbi; bantuan dari mentor di tempat kerja — waktu baik untuk majukan proyek penting.',
        wealth: 'Istana kekayaan bertemu Lucun; penghasilan stabil dengan kejutan kecil — perhatikan peluang investasi.',
        love: 'Bintang phoenix merah menggerakkan istana pernikahan; lajang mungkin bertemu jodoh, pasangan makin dekat.',
        health: 'Istana kesehatan stabil; jaga lambung dan limpa, makanlah yang ringan.',
        luckyColor: { name: 'Ungu', hex: '#6B4E9B' },
        luckyNumbers: ['3', '8'],
        suitable: ['Tanda tangan', 'Bepergian', 'Bertemu teman'],
        avoid: ['Konflik', 'Begadang', 'Pengeluaran besar']
      }
    }
  };

  /* 幸运色为中文色名（如“紫色”）→ 映射为色值用于色块展示 */
  var COLOR_MAP = {
    '紫': '#6B4E9B', '靛': '#3F51B5', '蓝': '#3A5F8A',
    '红': '#B23A2E', '朱': '#C0392B', '赤': '#C0392B', '粉': '#D98BA0', '桃': '#E58AA0',
    '黄': '#C9A227', '金': '#D4AF37', '橙': '#D98A3B', '杏': '#E8C39E',
    '绿': '#4F7A4A', '青': '#4A7C6F', '碧': '#3E8E7E',
    '白': '#EDE9E0', '银': '#C7C7C7', '灰': '#8C8C8C', '米': '#E8E0CE',
    '黑': '#1A1C23', '墨': '#22252B',
    '棕': '#8A6A4F', '褐': '#7A5C43'
  };
  var DEFAULT_COLOR = '#6B4E9B';   // 未命中时回退主题紫

  function hexOfColor(name) {
    var s = String(name || '');
    var keys = Object.keys(COLOR_MAP);
    for (var i = 0; i < keys.length; i++) {
      if (s.indexOf(keys[i]) !== -1) return COLOR_MAP[keys[i]];
    }
    return DEFAULT_COLOR;
  }

  /* ---------------- 工具 ---------------- */


  function render(tpl, vars) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
    });
  }

  /* 「不清楚具体时间」或空值 → 12:00；否则 HH:00 */
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

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDate(d) {
    var dt = (d instanceof Date) ? d : (d ? new Date(d) : new Date());
    if (isNaN(dt.getTime())) dt = new Date();
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  }

  function keyOf(date) {
    var acct = (window.YiNumUser && window.YiNumUser.getAccountId) ? window.YiNumUser.getAccountId() : 'anon';
    return STORE_PREFIX + acct + ':' + formatDate(date || new Date());
  }

  /* 去除 Markdown 标记并截取 JSON 主体 */
  function stripMarkdown(text) {
    var s = String(text == null ? '' : text).trim();
    s = s.replace(/^\s*```(?:json|JSON)?\s*/, '');
    s = s.replace(/\s*```\s*$/, '');
    s = s.replace(/```(?:json|JSON)?/g, '');
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    return s.trim();
  }

  function parseZiweiJSON(content) {
    try {
      return JSON.parse(stripMarkdown(content));
    } catch (e1) {
      try {
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

  /* 归一化单个语言块（zh-CN / en / id），兼容官方格式与常见变体 */
  function normalizeLangBlock(rawLang) {
    if (!rawLang || typeof rawLang !== 'object') return null;
    var fb = FALLBACK.langs['zh-CN'];
    function text(v, dfb) { return String(v || '').trim() || dfb; }
    function list(v, dfb, n) {
      var arr = Array.isArray(v) ? v.slice(0, n) : (v == null ? [] : [v]);
      arr = arr.map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean);
      return arr.length ? arr : dfb.slice(0, n);
    }
    /* 幸运色：官方为字符串，也兼容 {name,hex} 结构 */
    var lcRaw = rawLang.luckyColor;
    var colorName;
    var colorHex = '';
    if (lcRaw && typeof lcRaw === 'object') {
      colorName = String(lcRaw.name || '').trim();
      colorHex = /^#[0-9a-fA-F]{3,8}$/.test(String(lcRaw.hex || '')) ? lcRaw.hex : '';
    } else {
      colorName = String(lcRaw || '').trim();
    }
    colorName = colorName || fb.luckyColor.name;
    if (!colorHex) colorHex = hexOfColor(colorName);
    return {
      overall: text(rawLang.overall, fb.overall),
      career: text(rawLang.career, fb.career),
      wealth: text(rawLang.wealth, fb.wealth),
      love: text(rawLang.love, fb.love),
      health: text(rawLang.health, fb.health),
      luckyColor: { name: colorName, hex: colorHex },
      luckyNumbers: list(rawLang.luckyNumber || rawLang.luckyNumbers, fb.luckyNumbers, 2),
      suitable: list(rawLang.suitable, fb.suitable, 3),
      avoid: list(rawLang.avoid, fb.avoid, 3)
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
      langs: {
        'zh-CN': zh,
        'en': pick('en') || zh,
        'id': pick('id') || zh
      },
      isFallback: false,
      updatedAt: Date.now()
    };
  }

  /* ---------------- 缓存（按日期） ---------------- */
  function getResult(date) {
    try {
      var raw = localStorage.getItem(keyOf(date || new Date()));
      if (!raw) return null;
      var o = JSON.parse(raw);
      /* 缓存已为统一结构（含 langs）；旧版单语缓存（含 overall）也可被 pickLang 识别 */
      return (o && (o.langs || o.overall)) ? o : null;
    } catch (e) { return null; }
  }
  function saveResult(date, data) {
    try { localStorage.setItem(keyOf(date || new Date()), JSON.stringify(data)); } catch (e) { /* 静默 */ }
  }
  function clearResult(date) {
    try { localStorage.removeItem(keyOf(date || new Date())); } catch (e) { /* 静默 */ }
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
    void el.offsetWidth;
    el.classList.add('is-show');
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(function () { el.classList.remove('is-show'); }, ms || 3200);
  }

  /* ---------------- 主流程 ---------------- */
  /**
   * 调用 DeepSeek 获取紫微斗数当日运势
   * @param {{year,month,day,hour,unknown,gender}} birthInfo 出生信息（与命数页共用）
   * @param {Date|string} [currentDate] 当前日期，默认今天
   * @returns {Promise<Object>}
   */
  async function fetchZiweiDaily(birthInfo, currentDate) {

    var vars = {
      year: birthInfo.year,
      month: birthInfo.month,
      day: birthInfo.day,
      time: normalizeTime(birthInfo),
      gender: normalizeGender(birthInfo.gender),
      currentDate: formatDate(currentDate || new Date())
    };

    var body = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_ROLE },
        { role: 'user', content: render(PROMPT_TEMPLATE, vars) }
      ],
      temperature: 0.8,
      stream: false
    };
    if (USE_JSON_MODE) body.response_format = { type: 'json_object' };

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

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
        ? json.choices[0].message.content : '';
      var data = normalizeResult(parseZiweiJSON(content));
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

  window.YiNumZiwei = {
    fetchZiweiDaily: fetchZiweiDaily,
    getResult: getResult,
    saveResult: saveResult,
    clearResult: clearResult,
    showToast: showToast,
    stripMarkdown: stripMarkdown,
    parseZiweiJSON: parseZiweiJSON,
    normalize: normalizeResult,          /* 供页面统一结构（兜底数据同样需要） */
    pickLang: function (data, lang) {
      if (data && data.langs) {
        return data.langs[lang] || data.langs['zh-CN'] || data.langs['en'] || data.langs['id'] || null;
      }
      return data;   /* 旧版单语缓存（无 langs） */
    },
    formatDate: formatDate,
    keyOf: keyOf,
    hexOfColor: hexOfColor,
    FALLBACK: FALLBACK,
    STORE_PREFIX: STORE_PREFIX,
    hasApiKey: function () { return true; }
  };
})();
