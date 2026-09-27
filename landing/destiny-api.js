/* =========================================================
   Yi-Num · 命数推演 API（DeepSeek）
   职责：
     1. 组装 System Prompt 模板（河图洛书 / 洛河理数 / 四柱八字）
     2. 调用 DeepSeek /chat/completions（Bearer 鉴权 + 超时中断）
     3. 安全解析：stripMarkdown → 抽取 JSON → try/catch
     4. 结果缓存 LocalStorage；失败时回落演示数据
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
    return 'yinum.destiny.result:' + acct;
  }
  var API_BASE = (function () {
    try { var d = localStorage.getItem('yinum.debug.apiBase'); if (d) return d; } catch (e) {}
    return (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_API_BASE) || '/api/deepseek';
  })();
  var MODEL = (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_MODEL) || 'deepseek-chat';
  var USE_JSON_MODE = window.YiNumConfig && typeof window.YiNumConfig.DEEPSEEK_JSON_MODE === 'boolean'
    ? window.YiNumConfig.DEEPSEEK_JSON_MODE
    : true;
  var TIMEOUT_MS = (window.YiNumConfig && window.YiNumConfig.DEEPSEEK_TIMEOUT_MS) || 60000;
  /* 代理槽位：default=命数/通用；对应 Worker 端 DEEPSEEK_API_KEY */
  var SLOT = 'default';

  /* ---------------------------------------------------------
     System Prompt 模板（占位符：{{year}} {{month}} {{day}} {{time}} {{gender}}）
     --------------------------------------------------------- */
  var SYSTEM_ROLE = '你是精通河图洛书、洛河理数、易经八卦与四柱八字的国学命理大师。' +
    '请严格按用户给定的 JSON 结构输出，只输出纯净 JSON，不要包含 Markdown 代码块或任何解释文字。';

  var PROMPT_TEMPLATE = [
    '你是一位精通河图洛书、洛河理数、易经八卦与四柱八字的国学命理大师。你的任务是根据用户的出生信息，利用洛河理数的原理进行命理推演，并严格按照指定的 JSON 格式输出结果。',
    '',
    '【用户输入信息】',
    '出生日期：{{year}}年{{month}}月{{day}}日',
    '出生时间：{{time}}（如果用户选择了“不清楚”，则默认传入 12:00）',
    '性别：{{gender}}',
    '',
    '【推演规则】',
    '1. 根据输入的年月日时，准确推算出四柱八字（天干地支）。',
    '2. 结合洛河理数（1-9数字与五行、八卦的对应关系）推演命格。',
    '3. 提炼出一句核心结论（如：天生带水，灵动聪慧，逢金之年易得贵人相助）。',
    '4. 撰写一段详细的命格批语（约150-200字，涵盖性格、事业、财运、感情及人生建议）。',
    '5. 推演出三个数字组：',
    '   - 【吉】：对用户有利的数字（2个），并附上一段批语（说明为何有利，适合用于什么场景）。',
    '   - 【中】：对用户中正平和的数字（2个），并附上一段批语（说明平淡安稳，适合日常使用）。',
    '   - 【凶】：对用户不利的数字（2个），并附上一段批语（说明为何相克，需谨慎使用）。',
    '',
    '【输出格式要求】',
    '必须严格输出纯净的 JSON 格式，不要包含任何 Markdown 代码块标记（如 ```json），不要包含任何额外的解释文字。',
    '',
    '【多语言输出要求】你必须在同一份 JSON 中，分别用三种语言输出全部文字内容：简体中文（zh-CN）、English（en）、Bahasa Indonesia（id）。',
    'JSON 顶层固定为 {"langs":{...}}，三种语言结构完全一致、字段名相同，仅文字不同：',
    '{',
    '  "langs": {',
    '    "zh-CN": {',
    '      "bazi": ["丙午", "庚寅", "乙亥", "丙子"],',
    '      "coreConclusion": "天生带水，灵动聪慧，逢金之年易得贵人相助",',
    '      "detailedCommentary": "你命宫安稳，外柔内刚，少年多波折而中年渐入佳境。水主智，故你思虑绵密、善察人心，遇事能屈能伸，不争一时之短长。金能生水，逢金旺之年，贵人自远方来，事业与财禄皆有转机。宜近水而居，宜与数理为伴，以数字调和气运，可趋吉避凶、稳中求进。",',
    '      "luckyNumbers": { "numbers": ["3", "8"], "comment": "此数与你相生，逢此数易遇良机，适合用于密码、车牌或重要选择。" },',
    '      "neutralNumbers": { "numbers": ["1", "6"], "comment": "此数与你无冲无克，平淡安稳，适合日常使用。" },',
    '      "unluckyNumbers": { "numbers": ["2", "7"], "comment": "此数与你相克，需谨慎使用，避免作为重要决策的参考。" }',
    '    },',
    '    "en": { "/* 与 zh-CN 完全相同字段，内容为英文 */" },',
    '    "id": { "/* 与 zh-CN 完全相同字段，内容为印尼文 */" }',
    '  }',
    '}',
    '',
    '说明：bazi（四柱天干地支）三语言保持一致；coreConclusion、detailedCommentary 与三组数字的 comment 按各自语言输出。'
  ].join('\n');

  /* 兜底演示数据：请求失败 / 未配置 Key 时展示（含三语，与 langs 结构一致） */
  var FALLBACK = {
    isFallback: true,
    langs: {
      'zh-CN': {
        bazi: ['丙午', '庚寅', '乙亥', '丙子'],
        coreConclusion: '天生带水，灵动聪慧，逢金之年易得贵人相助',
        detailedCommentary: '你命宫安稳，外柔内刚，少年多波折而中年渐入佳境。水主智，故你思虑绵密、善察人心，遇事能屈能伸，不争一时之短长。金能生水，逢金旺之年，贵人自远方来，事业与财禄皆有转机。宜近水而居，宜与数理为伴，以数字调和气运，可趋吉避凶、稳中求进。',
        luckyNumbers: { numbers: ['3', '8'], comment: '此数与你相生，逢此数易遇良机，适合用于密码、车牌或重要选择。' },
        neutralNumbers: { numbers: ['1', '6'], comment: '此数与你无冲无克，平淡安稳，适合日常使用。' },
        unluckyNumbers: { numbers: ['2', '7'], comment: '此数与你相克，需谨慎使用，避免作为重要决策的参考。' }
      },
      'en': {
        bazi: ['丙午', '庚寅', '乙亥', '丙子'],
        coreConclusion: 'Born of Water — quick of mind and spirit; in golden years, noble helpers arrive.',
        detailedCommentary: 'Your fate palace is steady: gentle without, firm within. Early years carry trials, yet midlife turns the tide. Water rules wisdom, so you read hearts finely and bend without breaking, never contesting a momentary gain. Metal feeds Water — when Metal is strong, helpers come from afar and both career and fortune shift. Stay near water, keep close to numbers, and let them tune your luck: you will draw near the auspicious and advance in steady steps.',
        luckyNumbers: { numbers: ['3', '8'], comment: 'These numbers resonate with you. Encountering them invites opportunity — ideal for passwords, license plates, or key choices.' },
        neutralNumbers: { numbers: ['1', '6'], comment: 'These numbers neither clash nor amplify. Calm and steady — well suited to everyday use.' },
        unluckyNumbers: { numbers: ['2', '7'], comment: 'These numbers work against you. Use them with care; avoid leaning on them for important decisions.' }
      },
      'id': {
        bazi: ['丙午', '庚寅', '乙亥', '丙子'],
        coreConclusion: 'Lahir membawa Air — cerdas dan tangkas; di tahun emas, penolong mulia datang.',
        detailedCommentary: 'Istana takdirmu stabil: lembut di luar, teguh di dalam. Masa muda penuh ujian, namun paruh usia membalikkan arah. Air menguasai kebijaksanaan, sehingga kau peka membaca hati dan lentur tanpa patah, tak pernah memperebutkan untung sesaat. Logam menghidupi Air — saat Logam kuat, penolong datang dari jauh dan karier serta rezeki berubah arah. Dekatilah air, rawatlah angka, dan biarkan keduanya menala nasibmu: kau akan mendekati yang baik dan melangkah dengan mantap.',
        luckyNumbers: { numbers: ['3', '8'], comment: 'Angka ini selaras dengan Anda. Bertemu angka ini membuka peluang — cocok untuk kata sandi, plat nomor, atau pilihan penting.' },
        neutralNumbers: { numbers: ['1', '6'], comment: 'Angka ini tak bertabrakan maupun memperkuat. Tenang dan stabil — pas untuk digunakan sehari-hari.' },
        unluckyNumbers: { numbers: ['2', '7'], comment: 'Angka ini berlawanan dengan Anda. Gunakan dengan hati-hati; hindari menjadikannya acuan keputusan penting.' }
      }
    }
  };

  /* ---------------- 工具 ---------------- */


  function render(tpl, vars) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : '';
    });
  }

  function normalizeTime(info) {
    // 「不清楚具体时间」或空值 → 默认 12:00；否则 HH:00
    var h = Number(info.hour);
    if (info.unknown || info.hour === null || info.hour === '' || isNaN(h)) return '12:00';
    return String(((h % 24) + 24) % 24).padStart(2, '0') + ':00';
  }

  function normalizeGender(g) {
    if (g === 'female') return '女';
    if (g === 'male') return '男';
    return '未说明';
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
  function parseDestinyJSON(content) {
    try {
      return JSON.parse(stripMarkdown(content));
    } catch (e1) {
      try {
        // 二次尝试：去掉中文引号、尾随逗号等常见脏数据
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

  function toStrArray(v, len) {
    var arr = Array.isArray(v) ? v.slice(0, len) : [];
    arr = arr.map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean);
    while (arr.length < len) arr.push('');
    return arr;
  }

  /* 归一化单个语言块（zh-CN / en / id） */
  function normalizeLangBlock(rawLang) {
    if (!rawLang || typeof rawLang !== 'object') return null;
    var f = FALLBACK.langs['zh-CN'];
    var data = {
      bazi: toStrArray(rawLang.bazi, 4),
      coreConclusion: String(rawLang.coreConclusion || '').trim() || f.coreConclusion,
      detailedCommentary: String(rawLang.detailedCommentary || '').trim() || f.detailedCommentary
    };
    ['luckyNumbers', 'neutralNumbers', 'unluckyNumbers'].forEach(function (k) {
      var src = rawLang[k] && typeof rawLang[k] === 'object' ? rawLang[k] : {};
      data[k] = {
        numbers: toStrArray(src.numbers, 2),
        comment: String(src.comment || '').trim() || f[k].comment
      };
    });
    return data;
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

  /* ---------------- 缓存 ---------------- */
  function saveResult(data) {
    try { localStorage.setItem(storeKey(), JSON.stringify(data)); } catch (e) { /* 隐私模式静默 */ }
  }
  function getResult() {
    try {
      var raw = localStorage.getItem(storeKey());
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (o && (o.langs || o.coreConclusion || (o.bazi && o.bazi.length))) ? o : null;
    } catch (e) { return null; }
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
    // 重触发过渡
    el.classList.remove('is-show');
    void el.offsetWidth;
    el.classList.add('is-show');
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(function () { el.classList.remove('is-show'); }, ms || 3200);
  }

  /* ---------------- 主流程 ---------------- */
  /**
   * 调用 DeepSeek 获取命理推演数据
   * @param {{year:string,month:string,day:string,hour:string|null,unknown:boolean,gender:string}} birthInfo
   * @returns {Promise<Object>} 归一化后的推演结果；失败时 reject
   */
  async function fetchDestinyData(birthInfo) {

    var vars = {
      year: birthInfo.year,
      month: birthInfo.month,
      day: birthInfo.day,
      time: normalizeTime(birthInfo),
      gender: normalizeGender(birthInfo.gender)
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
      var data = normalizeResult(parseDestinyJSON(content));
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

  window.YiNumDestiny = {
    fetchDestinyData: fetchDestinyData,
    getResult: getResult,
    saveResult: saveResult,
    clearResult: clearResult,
    showToast: showToast,
    stripMarkdown: stripMarkdown,
    parseDestinyJSON: parseDestinyJSON,
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
