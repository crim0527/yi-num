/* =========================================================
   Yi-Num · 全站共享 i18n（zh-CN / en / id）
   首页 / 登录页 / 命数页 / 命数详情页 共用同一份字典与语言切换逻辑
   ========================================================= */
window.YiNumI18n = (function () {
  'use strict';

  var STORE_KEY = 'yi-num:lang';
  var DEFAULT_LANG = 'zh-CN';

  var LANGS = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
    { code: 'id', label: 'Bahasa Indonesia' }
  ];

  /* ---------------- 文案字典（全站） ---------------- */
  var DICT = {
    'zh-CN': {
      /* ---- 通用 ---- */
      langAria: '切换语言',
      navHome: '首页',
      navAbout: '关于我们',
      slogan: '易卦定数，数见天命',
      closeAria: '关闭菜单',
      drawerAdd: '添加到桌面',
      guest: '未登录',
      guestHint: '点击登录',

      /* ---- 首页 ---- */
      metaTitle: 'Yi-Num · 易卦定数，数见天命',
      brandAria: 'Yi-Num 首页',
      navChart: '命格数字',
      menuHome: '首页',
      menuChart: '命格数字',
      menuAbout: '关于',
      eyebrow: '紫微斗数 · 易经八卦',
      title: '易卦定数，\n数见天命',
      subtitle: '结合紫微斗数与易经八卦，探寻你与数字的微妙关系，点亮人生',
      cta: '马上体验',
      captionChart: '紫微斗数命盘',
      footerSlogan: '易卦定数，数见天命',

      /* ---- 登录页 ---- */
      loginTitle: '登录 · Yi-Num',
      welcomeTitle: '欢迎来到 Yi-Num',
      welcomeSub: '易卦定数，数见天命。',
      emailLabel: '邮箱',
      emailPh: '输入你的邮箱地址',
      codeLabel: '验证码',
      codePh: '输入验证码',
      sendCode: '发送验证码',
      login: '登录',
      or: 'or',
      google: '通过 Google 登录',
      agreePrefix: '使用即代表你同意我们的',
      terms: '服务协议',
      privacy: '隐私政策',
      errEmailRequired: '请输入邮箱地址',
      errEmailInvalid: '请输入有效的邮箱地址',
      errCodeRequired: '请输入验证码',
      errCodeInvalid: '验证码为 6 位数字',
      errSendFailed: '发送失败，请稍后重试',
      errLinkSent: '登录链接已发送至邮箱，请点击邮件中的链接完成登录（未收到请检查垃圾邮件）',
      errAuthNotConfigured: '登录服务未配置，请联系管理员',
      errGoogleFailed: 'Google 登录失败，请稍后重试',
      devCodeHint: '（开发模式验证码：{code}）',
      sentTo: '验证码已发送至 ',
      sentToLink: '登录链接已发送至 ',
      sendLink: '发送登录链接',
      resendIn: '{s} 秒后重发',

      /* ---- 命数页 ---- */
      destinyTitle: '命格数字 · Yi-Num',
      pageTitle: '命格数字',
      menuAria: '打开菜单',
      navDestiny: '命格数字',
      askTitle: '定制问事',
      navAsk: '定制问事',
      askQuote: '人生只有一种英雄主义，那就是认清生活后仍旧热爱生活。',
      askComingSoon: '暂未上线，敬请期待',
      askBigTop: '认清生活',
      askBigBottom: '热爱生活',
      askStatus: '定制问事 · 待启',
      luckyTitle: '今日吉时 · Yi-Num',
      navLuckyTime: '今日吉时',
      luckyBigTop: '吉时',
      luckyBigBottom: '待启',
      luckyStatus: '今日吉时 · 待启',
      luckyComingSoon: '敬请期待',
      luckyCardComment: '查看批语',
      luckyLucky: '吉时',
      luckyBad: '凶时',
      luckyCommentGood: '五行完全契合：申时五行属金，是你的财星，能直接补益你命局所喜，有助于增强财运和行动力；申中藏有壬水，是你的官星，代表事业与贵人，能带来双重助力。黄历吉神加持：当天申时为“司命”吉星当值，是黄道吉时，适合祈福、求嗣、订婚、嫁娶、出行、求财、开市、交易、安床、赴任等事宜。',
      luckyCommentBad: '当天的子时（23:00-00:59）在黄历上为凶时，且子时五行虽属水，但为“日破”之时，诸事不宜，建议避开。',
      luckyCommentBad2: '当天的丑时（01:00-02:59）在黄历上为凶时，宜静不宜动，诸事谨慎，建议避开。',
      luckyCommentBadAll: '当天的子时（23:00-00:59）为“日破”之时，诸事不宜，建议避开；丑时（01:00-02:59）宜静不宜动，诸事谨慎，同样建议避开。',
      luckySheetTitle: '今日批语',
      luckySheetClose: '关闭',
      openGuide: '新的一日，宜静心观时',
      openSub: '点击开启今日吉时，为你推演当日宜忌',
      openBtn: '开启今日吉时',
      openFootnote: '每日一启，顺天应时',
      luckyMore: '查看全部 ›',
      seal: '开启命数',
      sealAria: '开启命数',
      hint: '轻触古书，开启命数',
      bookTitle: '命数',
      bookSub: '开启命数',
      openBookAria: '开启命数',
      formTitle: '请填写你的基础信息',
      formSub: '生辰八字是命理推演的基础，请尽可能准确填写。',
      labelBirth: '出生年月日',
      labelTime: '出生时间',
      unknownTime: '不清楚具体时间',
      deriving: '推演中…',
      deriveFailed: '推演失败，请稍后重试',
      fallbackNote: '当前展示的是示例数据',
      luckyNeedProfile: '请先在【命数】完善出生信息',
      navZiwei: '紫微斗数',
      ziweiTitle: '紫微斗数 · Yi-Num',
      ziweiStartTitle: '今日运势',
      ziweiStartSub: '基于紫微斗数推演，为你揭示今日吉凶宜忌。',
      ziweiStartBtn: '发起算卦',
      ziweiNeedProfile: '请先前往【命数】填写出生信息',
      ziweiGoProfile: '前往填写',
      ziweiRedo: '重新推演',
      ziweiOverall: '整体运势',
      ziweiCareer: '事业',
      ziweiWealth: '财运',
      ziweiLove: '感情',
      ziweiHealth: '健康',
      ziweiSuitable: '宜',
      ziweiAvoid: '忌',
      ziweiIntro: '紫微斗数，源自易经，以星盘推演命运轨迹。每日运势，吉凶宜忌，助你顺势而为，趋吉避凶。',
      ziweiFillBtn: '完善个人信息',
      ziweiFormTitle: '完善个人信息',
      ziweiFormSave: '保存',
      phYear: '年',
      phMonth: '月',
      phDay: '日',
      phHour: '时间',
      formError: '请完整填写出生年月日与时间',
      labelGender: '性别',
      phGender: '请选择',
      genderMale: '男',
      genderFemale: '女',
      pickerCancel: '取消',
      pickerDone: '完成',
      revealTitle: '命盘已启',
      revealSub: '紫微斗数 · 易经八卦',

      /* ---- 命数详情页 ---- */
      detailTitle: '命格数字 · Yi-Num',
      detailPageTitle: '命格数字',
      backAria: '返回',
      comingSoon: '命格数字详情正在排盘，敬请期待',
      fateTitle: '命格八字',
      baziUnknown: '未知',
      fateConclusion: '天生带水，灵动聪慧，逢金之年易得贵人相助',
      fateDetailLabel: '详细批语',
      fateText: '你命宫安稳，外柔内刚，少年多波折而中年渐入佳境。水主智，故你思虑绵密、善察人心，遇事能屈能伸，不争一时之短长。金能生水，逢金旺之年，贵人自远方来，事业与财禄皆有转机。宜近水而居，宜与数理为伴，以数字调和气运，可趋吉避凶、稳中求进。',
      luckyTitle: '吉',
      luckyText: '此数与你相生，逢此数易遇良机，适合用于密码、车牌或重要选择。',
      neutralTitle: '中',
      neutralText: '此数与你无冲无克，平淡安稳，适合日常使用。',
      badTitle: '凶',
      badText: '此数与你相克，需谨慎使用，避免作为重要决策的参考。',
      rederiveBtn: '重新推演',

      /* ---- 关于我们页 ---- */
      aboutMetaTitle: '关于我们 · Yi-Num',
      aboutPageTitle: '关于我们',
      aboutBrandCn: '易数',
      aboutBrandSub: '易数智能科技有限公司（YinumAI Limited）',
      aboutIntroTitle: '公司简介',
      aboutIntroBody: '易数智能科技有限公司于 2026 年正式成立，是一家以人工智能为核心、以东方智慧为灵感的创新科技公司。我们推出核心品牌 Yi-Num，专注于探索《易经》象数文化、数字玄学与现代大型语言模型（LLM）技术的深度融合，帮助人们以更从容、更清晰、更智能的方式理解变化、面对选择、享受生活。',
      aboutBelieveTitle: '我们相信',
      aboutBelieveBody: '科技不应只是冰冷的效率工具，也可以成为连接文化、心灵与日常生活的桥梁。易经所蕴含的阴阳变化、象数思维、周期观念与整体视角，为现代人提供了一种独特的思考框架；而大型语言模型则让这种古老智慧能够以自然语言交互、个性化解读和场景化陪伴的方式，走进普通人的日常生活。',
      aboutNameTitle: 'Yi-Num 之名',

      /* ---- 供奉页 ---- */
      navOffering: '每日供奉',
      offeringTitle: '每日供奉 · Yi-Num',
      offeringPageTitle: '每日供奉',
      offeringMerit: '今日功德',
      offeringIncense: '点香',
      offeringIncenseReady: '敬一炷香',
      offeringNextIncense: '下一炷香',
      offeringIncenseDone: '敬香完成，功德 +1',
      offeringLamp: '点灯',
      offeringLampCost: '消耗 {n} 张券',
      offeringLampRunning: '灯烛燃亮中',
      offeringLampNoTicket: '点灯券不足',
      offeringLampTitle: '选择点灯时长',
      offeringLampHint: '每 30 分钟消耗 1 张点灯券',
      offeringLampStarted: '灯烛已亮，{m} 分钟后功德圆满',
      offeringLampDone: '灯烛燃尽，功德 +{n}',
      offeringNoTicket: '点灯券不足，可通过完成任务获取',
      offeringTicket: '点灯券',
      offeringTicketUnit: '张',
      offeringTimerLamp: '点灯',
      offeringTimerIncense: '香火',
      offeringPause: '暂停',
      offeringResume: '继续',
      offeringMusic: '音乐',
      offeringMuyu: '木鱼',
      offeringBook: '香谱',
      offeringBookDesc: '三炷香，敬天、敬地、敬人心；一炷一愿，心诚则灵。',
      offeringRecordIncense: '敬香',
      offeringRecordLamp: '点灯',
      offeringRecordEmpty: '暂无供奉记录',
      offeringMinute: '{m} 分钟',
      offeringCancel: '取消',
      offeringConfirm: '确认',
      offeringClose: '关闭',
      offeringReset: '重置供奉状态',
      offeringResetDone: '供奉状态已重置',
      offeringNoAudio: '当前浏览器不支持音频播放',
      offeringPrevAria: '上一位神像',
      offeringNextAria: '下一位神像',
      aboutNameBody: 'Yi 取自《易经》的“易”，也象征“一”——万物归一、变化中有恒常；Num 代表数字、数理与计算，象征现代科技对规律的探索。Yi-Num 不只是一个工具，更是一种“东方智慧 + AI”的生活方式助手。',
      aboutWhyTitle: '我们为何出发',
      aboutWhyBody: '在快速变化的时代，人们面临越来越多选择：事业方向、关系沟通、生活节奏、情绪管理、自我认知……很多时候，人们需要的不是唯一答案，而是一个更全面的视角、一种更平静的心态、一套更有结构的思考方式。我们希望借助 AI 技术，把《易经》中关于变化的智慧，从晦涩的文本中释放出来，转化为现代人可理解、可体验、可日常使用的智能服务。',
      aboutWhatTitle: '我们做什么',
      aboutCard1Title: '易经文化数字化',
      aboutCard1Desc: '将八卦、六十四卦、阴阳五行、象数理占等传统文化内容进行结构化、知识化整理。',
      aboutCard2Title: '智能问答与个性化解读',
      aboutCard2Desc: '基于 LLM 技术，让用户以自然语言了解易经知识、卦象含义与变化逻辑。',
      aboutCard3Title: '生活场景辅助',
      aboutCard3Desc: '围绕自我认知、关系沟通、事业规划、情绪调适、生活节奏等场景，提供文化视角下的思考参考。',
      aboutCard4Title: '文化内容与教育',
      aboutCard4Desc: '通过文章、课程、互动体验等形式，推动易经文化的理性传播与现代表达。',
      aboutCard5Title: '企业级与开发者服务',
      aboutCard5Desc: '探索东方智慧知识库、AI 解读引擎、API 接口等能力，服务更多文化与商业场景。',
      aboutMissionTitle: '使命',
      aboutMissionBody: '让东方智慧在 AI 时代被重新理解、被轻松使用、被更好传承。',
      aboutVisionTitle: '愿景',
      aboutVisionBody: '成为全球领先的东方智慧 AI 平台，让每个人都能在变化的世界中，找到更从容的自己。',
      aboutValuesTitle: '我们的价值观',
      aboutVal1K: '守正创新',
      aboutVal1D: '尊重传统文化本源，同时拥抱现代科技。',
      aboutVal2K: '科技向善',
      aboutVal2D: '不制造焦虑，不渲染恐惧，不承诺宿命式结果。',
      aboutVal3K: '理性克制',
      aboutVal3D: '将易经作为文化学习、自我觉察与生活参考，而非替代专业判断。',
      aboutVal4K: '隐私优先',
      aboutVal4D: '重视用户数据安全与隐私保护。',
      aboutVal5K: '开放共创',
      aboutVal5D: '与用户、研究者、文化机构和技术伙伴共同探索东方智慧的现代价值。',
      aboutBoundaryTitle: '我们的边界与责任',
      aboutBoundaryBody: 'Yi-Num 提供的内容主要用于文化学习、娱乐参考、个人成长与生活启发，不构成医疗、法律、金融、婚姻等专业建议。我们反对迷信恐吓、过度承诺和诱导消费。我们希望用理性、温暖、负责任的方式，让易经文化在数字时代获得更健康、更持久的生命力。',
      aboutCopyright: '© 2026 YinumAI Limited. All rights reserved.'
    },

    'en': {
      /* ---- 通用 ---- */
      langAria: 'Change language',
      navHome: 'Home',
      navAbout: 'About',
      slogan: 'Set by trigrams, revealed in numbers',
      closeAria: 'Close menu',
      drawerAdd: 'Add to Home Screen',
      guest: 'Not signed in',
      guestHint: 'Tap to sign in',

      /* ---- 首页 ---- */
      metaTitle: 'Yi-Num · Set by trigrams, revealed by numbers',
      brandAria: 'Yi-Num Home',
      navChart: 'Destiny',
      menuHome: 'Home',
      menuChart: 'Destiny',
      menuAbout: 'About',
      eyebrow: 'Zi Wei Dou Shu · I Ching Bagua',
      title: 'Set by trigrams,\nfate revealed in numbers',
      subtitle: 'Blending Zi Wei Dou Shu and the I Ching’s Eight Trigrams, we explore your subtle bond with numbers and illuminate your life.',
      cta: 'Experience Now',
      captionChart: 'Zi Wei Dou Shu Chart',
      footerSlogan: 'Set by trigrams, revealed in numbers',

      /* ---- 登录页 ---- */
      loginTitle: 'Log in · Yi-Num',
      welcomeTitle: 'Welcome to Yi-Num',
      welcomeSub: 'Trigrams set the numbers; numbers reveal your destiny.',
      emailLabel: 'Email',
      emailPh: 'Enter your email address',
      codeLabel: 'Verification code',
      codePh: 'Enter verification code',
      sendCode: 'Send code',
      login: 'Log in',
      or: 'or',
      google: 'Continue with Google',
      agreePrefix: 'By using, you agree to our',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      errEmailRequired: 'Please enter your email address',
      errEmailInvalid: 'Please enter a valid email address',
      errCodeRequired: 'Please enter the verification code',
      errCodeInvalid: 'The code must be 6 digits',
      errSendFailed: 'Failed to send. Please try again.',
      errLinkSent: 'A sign-in link has been sent to your email. Open it to finish signing in (check spam if missing).',
      errAuthNotConfigured: 'Sign-in service is not configured. Please contact the administrator.',
      errGoogleFailed: 'Google sign-in failed. Please try again.',
      devCodeHint: ' (Dev mode code: {code})',
      sentTo: 'Code sent to ',
      sentToLink: 'Sign-in link sent to ',
      sendLink: 'Send sign-in link',
      resendIn: 'Resend in {s}s',

      /* ---- 命数页 ---- */
      destinyTitle: 'Destiny · Yi-Num',
      pageTitle: 'Destiny',
      menuAria: 'Open menu',
      navDestiny: 'Destiny',
      askTitle: 'Ask',
      navAsk: 'Ask',
      askQuote: 'There is only one heroism in the world: to see the world as it is, and to love it.',
      askComingSoon: 'Coming soon',
      askBigTop: 'SEE LIFE',
      askBigBottom: 'LOVE LIFE',
      askStatus: 'Ask · Awaits',
      luckyTitle: 'Lucky Time · Yi-Num',
      navLuckyTime: 'Lucky Time',
      luckyBigTop: 'LUCKY',
      luckyBigBottom: 'TIME',
      luckyStatus: 'Lucky Time · Soon',
      luckyComingSoon: 'Coming soon',
      luckyCardComment: 'Show reading',
      luckyLucky: 'Lucky Hours',
      luckyBad: 'Unlucky Hours',
      luckyCommentGood: "Shen hour (Metal) is your wealth star and its hidden Ren water is your career star, doubling its boost. It is also guarded by the 'Siming' auspicious star — a golden hour good for blessings, marriage, travel, wealth, business and more.",
      luckyCommentBad: "Zi hour (23:00-00:59) is inauspicious and a 'day-breaking' time; avoid all important matters.",
      luckyCommentBad2: "Chou hour (01:00-02:59) is inauspicious; keep still and act with caution.",
      luckyCommentBadAll: "Zi hour (23:00-00:59) is a 'day-breaking' time — avoid all important matters; Chou hour (01:00-02:59) is also inauspicious, so keep still and act with caution.",
      luckySheetTitle: "Today's Reading",
      luckySheetClose: 'Close',
      openGuide: 'A new day — still your mind and observe the hour',
      openSub: 'Tap to reveal today’s auspicious and inauspicious hours',
      openBtn: 'Reveal Today’s Lucky Hours',
      openFootnote: 'Once a day, in accord with heaven',
      luckyMore: 'View all ›',
      seal: 'Open Destiny',
      sealAria: 'Open your destiny',
      hint: 'Tap the book to open your destiny',
      bookTitle: 'Destiny',
      bookSub: 'Open',
      openBookAria: 'Open the book',
      formTitle: 'Enter your basic information',
      formSub: 'Your birth data forms the basis of the reading — please be as accurate as possible.',
      labelBirth: 'Date of birth',
      labelTime: 'Time of birth',
      unknownTime: 'Unsure of the exact time',
      deriving: 'Consulting fate…',
      deriveFailed: 'Divination failed, please try again later',
      fallbackNote: 'Showing sample data',
      luckyNeedProfile: 'Please complete your birth info in Destiny first',
      navZiwei: 'Zi Wei',
      ziweiTitle: 'Zi Wei · Yi-Num',
      ziweiStartTitle: "Today's Fortune",
      ziweiStartSub: 'Based on Zi Wei Dou Shu — revealing what today favours and forbids.',
      ziweiStartBtn: "Cast Today's Chart",
      ziweiNeedProfile: 'Please fill in your birth info in Destiny first',
      ziweiGoProfile: 'Go to fill in',
      ziweiRedo: 'Recast',
      ziweiOverall: 'Overall',
      ziweiCareer: 'Career',
      ziweiWealth: 'Wealth',
      ziweiLove: 'Love',
      ziweiHealth: 'Health',
      ziweiSuitable: 'Auspicious',
      ziweiAvoid: 'Inauspicious',
      ziweiIntro: 'Rooted in the I Ching, Zi Wei Dou Shu charts fate through the stars — daily fortune, what to do and what to avoid.',
      ziweiFillBtn: 'Complete Your Info',
      ziweiFormTitle: 'Complete Your Info',
      ziweiFormSave: 'Save',
      phYear: 'Year',
      phMonth: 'Month',
      phDay: 'Day',
      phHour: 'Time',
      formError: 'Please complete date and time of birth',
      labelGender: 'Gender',
      phGender: 'Select',
      genderMale: 'Male',
      genderFemale: 'Female',
      pickerCancel: 'Cancel',
      pickerDone: 'Done',
      revealTitle: 'Chart revealed',
      revealSub: 'Zi Wei Dou Shu · I Ching',

      /* ---- 命数详情页 ---- */
      detailTitle: 'Destiny · Yi-Num',
      detailPageTitle: 'Destiny',
      backAria: 'Back',
      comingSoon: 'Your destiny chart is being prepared',
      fateTitle: 'Destiny Pillars',
      baziUnknown: 'Unknown',
      fateConclusion: 'Born of Water — quick of mind and spirit; in golden years, noble helpers arrive.',
      fateDetailLabel: 'Full Reading',
      fateText: 'Your fate palace is steady: gentle without, firm within. Early years carry trials, yet midlife turns the tide. Water rules wisdom, so you read hearts finely and bend without breaking, never contesting a momentary gain. Metal feeds Water — when Metal is strong, helpers come from afar and both career and fortune shift. Stay near water, keep close to numbers, and let them tune your luck: you will draw near the auspicious and advance in steady steps.',
      luckyTitle: 'Auspicious',
      luckyText: 'These numbers resonate with you. Encountering them invites opportunity — ideal for passwords, license plates, or key choices.',
      neutralTitle: 'Neutral',
      neutralText: 'These numbers neither clash nor amplify. Calm and steady — well suited to everyday use.',
      badTitle: 'Inauspicious',
      badText: 'These numbers work against you. Use them with care; avoid leaning on them for important decisions.',
      rederiveBtn: 'Re-calculate',

      /* ---- About page ---- */
      aboutMetaTitle: 'About · Yi-Num',
      aboutPageTitle: 'About',
      aboutBrandCn: '易数',
      aboutBrandSub: 'YinumAI Limited',
      aboutIntroTitle: 'Company',
      aboutIntroBody: 'Founded in 2026, YinumAI Limited is an innovative technology company built around artificial intelligence and inspired by Eastern wisdom. Our core brand, Yi-Num, explores the deep fusion of the I Ching’s image-number culture, numerology, and modern large language model (LLM) technology — helping people understand change, face choices, and enjoy life with more calm, clarity, and intelligence.',
      aboutBelieveTitle: 'What we believe',
      aboutBelieveBody: 'Technology should not be merely a cold instrument of efficiency; it can also become a bridge connecting culture, the mind, and everyday life. The I Ching’s yin-yang change, image-number thinking, cyclical perspective, and holistic view offer modern people a unique framework for thought. Large language models let this ancient wisdom enter ordinary life through natural-language interaction, personalized interpretation, and scened companionship.',
      aboutNameTitle: 'The name Yi-Num',

      /* ---- Offering page ---- */
      navOffering: 'Offering',
      offeringTitle: 'Offering · Yi-Num',
      offeringPageTitle: 'Offering',
      offeringMerit: "Today's Merit",
      offeringIncense: 'Light incense',
      offeringIncenseReady: 'Offer a stick',
      offeringNextIncense: 'Next in',
      offeringIncenseDone: 'Incense offered, merit +1',
      offeringLamp: 'Light lamp',
      offeringLampCost: 'Costs {n} ticket(s)',
      offeringLampRunning: 'Lamp burning',
      offeringLampNoTicket: 'Not enough tickets',
      offeringLampTitle: 'Choose lamp duration',
      offeringLampHint: 'Every 30 minutes costs 1 lamp ticket',
      offeringLampStarted: 'Lamp lit — merit completes in {m} minutes',
      offeringLampDone: 'Lamp burned out, merit +{n}',
      offeringNoTicket: 'Not enough lamp tickets — complete tasks to earn them',
      offeringTicket: 'Lamp tickets',
      offeringTicketUnit: '',
      offeringTimerLamp: 'Lamp',
      offeringTimerIncense: 'Incense',
      offeringPause: 'Pause',
      offeringResume: 'Resume',
      offeringMusic: 'Music',
      offeringMuyu: 'Wooden fish',
      offeringBook: 'Incense records',
      offeringBookDesc: 'Three sticks — for heaven, for earth, for the human heart. One wish per stick; sincerity is what answers.',
      offeringRecordIncense: 'Incense',
      offeringRecordLamp: 'Lamp',
      offeringRecordEmpty: 'No offering records yet',
      offeringMinute: '{m} min',
      offeringCancel: 'Cancel',
      offeringConfirm: 'Confirm',
      offeringClose: 'Close',
      offeringReset: 'Reset offering state',
      offeringResetDone: 'Offering state reset',
      offeringNoAudio: 'Audio is not supported in this browser',
      offeringPrevAria: 'Previous deity',
      offeringNextAria: 'Next deity',
      aboutNameBody: '“Yi” comes from the I Ching’s “易” (change) and also symbolizes “一” (one) — all things returning to unity, with constancy amid change. “Num” stands for number, numerology, and computation, symbolizing modern technology’s pursuit of patterns. Yi-Num is not just a tool, but a lifestyle companion of “Eastern wisdom + AI”.',
      aboutWhyTitle: 'Why we began',
      aboutWhyBody: 'In an era of rapid change, people face ever more choices — career direction, relationships, life rhythm, emotional management, self-understanding… Often what they need is not a single answer, but a broader perspective, a calmer mindset, and a more structured way to think. With AI, we hope to free the I Ching’s wisdom about change from obscure texts and turn it into intelligent services that modern people can understand, experience, and use daily.',
      aboutWhatTitle: 'What we do',
      aboutCard1Title: 'Digitalizing I Ching culture',
      aboutCard1Desc: 'Structuring and systematizing traditional culture — the eight trigrams, sixty-four hexagrams, yin-yang and the five elements, image-number divination.',
      aboutCard2Title: 'Smart Q&A and personalized reading',
      aboutCard2Desc: 'Powered by LLMs, letting users learn I Ching knowledge, hexagram meaning, and the logic of change in natural language.',
      aboutCard3Title: 'Life-scenario assistance',
      aboutCard3Desc: 'Around self-awareness, communication, career planning, emotional balance, and daily rhythm, we offer cultural perspectives for reflection.',
      aboutCard4Title: 'Culture and education',
      aboutCard4Desc: 'Through articles, courses, and interactive experiences, we promote the rational spread and modern expression of I Ching culture.',
      aboutCard5Title: 'Enterprise & developer services',
      aboutCard5Desc: 'Exploring an Eastern-wisdom knowledge base, AI interpretation engine, and API capabilities to serve more cultural and commercial scenarios.',
      aboutMissionTitle: 'Mission',
      aboutMissionBody: 'To make Eastern wisdom re-understood, easily used, and better inherited in the AI era.',
      aboutVisionTitle: 'Vision',
      aboutVisionBody: 'To become the world’s leading Eastern-wisdom AI platform, so everyone can find a calmer self in a changing world.',
      aboutValuesTitle: 'Our values',
      aboutVal1K: 'Integrity & innovation',
      aboutVal1D: 'Respect the roots of traditional culture while embracing modern technology.',
      aboutVal2K: 'Technology for good',
      aboutVal2D: 'We do not manufacture anxiety, spread fear, or promise fatalistic outcomes.',
      aboutVal3K: 'Reason & restraint',
      aboutVal3D: 'We treat the I Ching as cultural learning, self-awareness, and life reference — not a substitute for professional judgment.',
      aboutVal4K: 'Privacy first',
      aboutVal4D: 'We value the security and privacy of user data.',
      aboutVal5K: 'Open co-creation',
      aboutVal5D: 'Together with users, researchers, cultural institutions, and tech partners, we explore the modern value of Eastern wisdom.',
      aboutBoundaryTitle: 'Our boundaries & responsibility',
      aboutBoundaryBody: 'Yi-Num’s content is mainly for cultural learning, entertainment reference, personal growth, and life inspiration. It does not constitute medical, legal, financial, or marital advice. We oppose superstition, fear-mongering, over-promising, and manipulative sales. We hope to let I Ching culture gain a healthier, more enduring life in the digital age — with reason, warmth, and responsibility.',
      aboutCopyright: '© 2026 YinumAI Limited. All rights reserved.'
    },

    'id': {
      /* ---- 通用 ---- */
      langAria: 'Ubah bahasa',
      navHome: 'Beranda',
      navAbout: 'Tentang',
      slogan: 'Ditentukan trigram, terungkap angka',
      closeAria: 'Tutup menu',
      drawerAdd: 'Tambahkan ke Layar',
      guest: 'Belum masuk',
      guestHint: 'Ketuk untuk masuk',

      /* ---- 首页 ---- */
      metaTitle: 'Yi-Num · Ditentukan trigram, terungkap angka',
      brandAria: 'Beranda Yi-Num',
      navChart: 'Takdir',
      menuHome: 'Beranda',
      menuChart: 'Takdir',
      menuAbout: 'Tentang',
      eyebrow: 'Zi Wei Dou Shu · Ba Gua',
      title: 'Ditentukan trigram,\ntakdir terungkap angka',
      subtitle: 'Memadukan Zi Wei Dou Shu dan Delapan Trigram I Ching, kami mengeksplorasi hubungan halus Anda dengan angka dan menerangi hidup Anda.',
      cta: 'Rasakan Sekarang',
      captionChart: 'Papan Zi Wei Dou Shu',
      footerSlogan: 'Ditentukan trigram, terungkap angka',

      /* ---- 登录页 ---- */
      loginTitle: 'Masuk · Yi-Num',
      welcomeTitle: 'Selamat datang di Yi-Num',
      welcomeSub: 'Trigram menentukan angka; angka menyingkap takdir.',
      emailLabel: 'Email',
      emailPh: 'Masukkan alamat email Anda',
      codeLabel: 'Kode verifikasi',
      codePh: 'Masukkan kode verifikasi',
      sendCode: 'Kirim kode',
      login: 'Masuk',
      or: 'atau',
      google: 'Masuk dengan Google',
      agreePrefix: 'Dengan menggunakan, Anda menyetujui',
      terms: 'Ketentuan Layanan',
      privacy: 'Kebijakan Privasi',
      errEmailRequired: 'Masukkan alamat email Anda',
      errEmailInvalid: 'Masukkan alamat email yang valid',
      errCodeRequired: 'Masukkan kode verifikasi',
      errCodeInvalid: 'Kode harus 6 digit',
      errSendFailed: 'Gagal mengirim. Coba lagi.',
      errLinkSent: 'Tautan masuk telah dikirim ke email Anda. Buka untuk menyelesaikan (cek folder spam).',
      errAuthNotConfigured: 'Layanan masuk belum dikonfigurasi. Silakan hubungi administrator.',
      errGoogleFailed: 'Login Google gagal. Silakan coba lagi.',
      devCodeHint: ' (Kode mode dev: {code})',
      sentTo: 'Kode dikirim ke ',
      sentToLink: 'Tautan masuk dikirim ke ',
      sendLink: 'Kirim tautan masuk',
      resendIn: 'Kirim ulang dalam {s}d',

      /* ---- 命数页 ---- */
      destinyTitle: 'Takdir · Yi-Num',
      pageTitle: 'Takdir',
      menuAria: 'Buka menu',
      navDestiny: 'Takdir',
      askTitle: 'Tanya',
      navAsk: 'Tanya',
      askQuote: 'Hanya ada satu keberanian dalam hidup: melihat dunia apa adanya, dan tetap mencintainya.',
      askComingSoon: 'Segera hadir',
      askBigTop: 'LIHAT HIDUP',
      askBigBottom: 'CINTAI HIDUP',
      askStatus: 'Tanya · Menanti',
      luckyTitle: 'Waktu Baik · Yi-Num',
      navLuckyTime: 'Waktu Baik',
      luckyBigTop: 'WAKTU',
      luckyBigBottom: 'BAIK',
      luckyStatus: 'Waktu Baik · Segera',
      luckyComingSoon: 'Segera hadir',
      luckyCardComment: 'Tampilkan tafsir',
      luckyLucky: 'Waktu Baik',
      luckyBad: 'Waktu Buruk',
      luckyCommentGood: 'Jam Shen (Logam) adalah bintang kekayaanmu dan Ren-air di dalamnya adalah bintang karier, memberi dorongan ganda. Dijaga bintang keberuntungan "Siming" — jam baik untuk doa, pernikahan, bepergian, dan usaha.',
      luckyCommentBad: 'Jam Zi (23:00-00:59) tidak baik dan merupakan waktu "pemutus hari"; hindari urusan penting.',
      luckyCommentBad2: 'Jam Chou (01:00-02:59) tidak baik; diamlah dan berhati-hatilah.',
      luckyCommentBadAll: 'Jam Zi (23:00-00:59) adalah waktu "pemutus hari" — hindari urusan penting; jam Chou (01:00-02:59) juga tidak baik, diamlah dan berhati-hatilah.',
      luckySheetTitle: 'Tafsir Hari Ini',
      luckySheetClose: 'Tutup',
      openGuide: 'Hari yang baru, heningkan hati dan amati waktu',
      openSub: 'Ketuk untuk membuka jam baik dan jam buruk hari ini',
      openBtn: 'Buka Jam Baik Hari Ini',
      openFootnote: 'Sekali sehari, selaras dengan alam',
      luckyMore: 'Lihat semua ›',
      seal: 'Buka Takdir',
      sealAria: 'Buka takdir Anda',
      hint: 'Ketuk buku untuk membuka takdir',
      bookTitle: 'Takdir',
      bookSub: 'Buka',
      openBookAria: 'Buka buku',
      formTitle: 'Isi informasi dasar Anda',
      formSub: 'Data kelahiran adalah dasar perhitungan — mohon diisi seteliti mungkin.',
      labelBirth: 'Tanggal lahir',
      labelTime: 'Waktu lahir',
      unknownTime: 'Tidak yakin waktu persis',
      deriving: 'Menghitung…',
      deriveFailed: 'Ramalan gagal, silakan coba lagi nanti',
      fallbackNote: 'Menampilkan data contoh',
      luckyNeedProfile: 'Lengkapi info kelahiran di Takdir terlebih dahulu',
      navZiwei: 'Zi Wei',
      ziweiTitle: 'Zi Wei · Yi-Num',
      ziweiStartTitle: 'Ramalan Hari Ini',
      ziweiStartSub: 'Berdasarkan Zi Wei Dou Shu — menyingkap hal baik dan pantangan hari ini.',
      ziweiStartBtn: 'Mulai Ramalan',
      ziweiNeedProfile: 'Silakan lengkapi info kelahiran di Takdir terlebih dahulu',
      ziweiGoProfile: 'Isi sekarang',
      ziweiRedo: 'Ulangi Ramalan',
      ziweiOverall: 'Keseluruhan',
      ziweiCareer: 'Karier',
      ziweiWealth: 'Rezeki',
      ziweiLove: 'Asmara',
      ziweiHealth: 'Kesehatan',
      ziweiSuitable: 'Disarankan',
      ziweiAvoid: 'Dihindari',
      ziweiIntro: 'Berakar dari I Ching, Zi Wei Dou Shu menakdir nasib lewat peta bintang — ramalan harian serta hal baik dan pantangan.',
      ziweiFillBtn: 'Lengkapi Data Diri',
      ziweiFormTitle: 'Lengkapi Data Diri',
      ziweiFormSave: 'Simpan',
      phYear: 'Tahun',
      phMonth: 'Bulan',
      phDay: 'Hari',
      phHour: 'Waktu',
      formError: 'Lengkapi tanggal dan waktu lahir',
      labelGender: 'Jenis kelamin',
      phGender: 'Pilih',
      genderMale: 'Laki-laki',
      genderFemale: 'Perempuan',
      pickerCancel: 'Batal',
      pickerDone: 'Selesai',
      revealTitle: 'Papan terbuka',
      revealSub: 'Zi Wei Dou Shu · I Ching',

      /* ---- 命数详情页 ---- */
      detailTitle: 'Takdir · Yi-Num',
      detailPageTitle: 'Takdir',
      backAria: 'Kembali',
      comingSoon: 'Papan takdir Anda sedang disiapkan',
      fateTitle: 'Pilar Takdir',
      baziUnknown: 'Tidak diketahui',
      fateConclusion: 'Lahir membawa Air — cerdas dan tangkas; di tahun emas, penolong mulia datang.',
      fateDetailLabel: 'Tafsir Lengkap',
      fateText: 'Istana takdirmu stabil: lembut di luar, teguh di dalam. Masa muda penuh ujian, namun paruh usia membalikkan arah. Air menguasai kebijaksanaan, sehingga kau peka membaca hati dan lentur tanpa patah, tak pernah memperebutkan untung sesaat. Logam menghidupi Air — saat Logam kuat, penolong datang dari jauh dan karier serta rezeki berubah arah. Dekatilah air, rawatlah angka, dan biarkan keduanya menala nasibmu: kau akan mendekati yang baik dan melangkah dengan mantap.',
      luckyTitle: 'Baik',
      luckyText: 'Angka ini selaras dengan Anda. Bertemu angka ini membuka peluang — cocok untuk kata sandi, plat nomor, atau pilihan penting.',
      neutralTitle: 'Netral',
      neutralText: 'Angka ini tak bertabrakan maupun memperkuat. Tenang dan stabil — pas untuk digunakan sehari-hari.',
      badTitle: 'Buruk',
      badText: 'Angka ini berlawanan dengan Anda. Gunakan dengan hati-hati; hindari menjadikannya acuan keputusan penting.',
      rederiveBtn: 'Hitung Ulang',

      /* ---- Halaman Tentang ---- */
      aboutMetaTitle: 'Tentang · Yi-Num',
      aboutPageTitle: 'Tentang',
      aboutBrandCn: '易数',
      aboutBrandSub: 'YinumAI Limited',
      aboutIntroTitle: 'Perusahaan',
      aboutIntroBody: 'Didirikan pada 2026, YinumAI Limited adalah perusahaan teknologi inovatif yang berpusat pada kecerdasan buatan dan terinspirasi oleh kearifan Timur. Merek inti kami, Yi-Num, mengeksplorasi fusi mendalam antara budaya citra-angka I Ching, numerologi, dan teknologi model bahasa besar (LLM) — membantu manusia memahami perubahan, menghadapi pilihan, dan menikmati hidup dengan lebih tenang, jernih, dan cerdas.',
      aboutBelieveTitle: 'Apa yang kami yakini',
      aboutBelieveBody: 'Teknologi seharusnya bukan sekadar alat efisiensi yang dingin; ia juga bisa menjadi jembatan yang menghubungkan budaya, batin, dan kehidupan sehari-hari. Perubahan yin-yang, pemikiran citra-angka, perspektif siklus, dan pandangan holistik I Ching menawarkan kerangka berpikir unik bagi manusia modern. Model bahasa besar membiarkan kebijaksanaan kuno ini masuk ke hidup biasa melalui interaksi bahasa alami, interpretasi personal, dan pendampingan berbasis situasi.',
      aboutNameTitle: 'Nama Yi-Num',

      /* ---- Halaman Persembahan ---- */
      navOffering: 'Persembahan',
      offeringTitle: 'Persembahan · Yi-Num',
      offeringPageTitle: 'Persembahan',
      offeringMerit: 'Pahala Hari Ini',
      offeringIncense: 'Nyalakan dupa',
      offeringIncenseReady: 'Persembahkan dupa',
      offeringNextIncense: 'Berikutnya',
      offeringIncenseDone: 'Dupa dipersembahkan, pahala +1',
      offeringLamp: 'Nyalakan lampu',
      offeringLampCost: 'Memakai {n} tiket',
      offeringLampRunning: 'Lampu menyala',
      offeringLampNoTicket: 'Tiket lampu kurang',
      offeringLampTitle: 'Pilih durasi lampu',
      offeringLampHint: 'Setiap 30 menit memakai 1 tiket lampu',
      offeringLampStarted: 'Lampu menyala — pahala genap dalam {m} menit',
      offeringLampDone: 'Lampu habis, pahala +{n}',
      offeringNoTicket: 'Tiket lampu tidak cukup — selesaikan tugas untuk mendapatkannya',
      offeringTicket: 'Tiket lampu',
      offeringTicketUnit: '',
      offeringTimerLamp: 'Lampu',
      offeringTimerIncense: 'Dupa',
      offeringPause: 'Jeda',
      offeringResume: 'Lanjut',
      offeringMusic: 'Musik',
      offeringMuyu: 'Ikan kayu',
      offeringBook: 'Catatan dupa',
      offeringBookDesc: 'Tiga batang dupa — untuk langit, bumi, dan hati manusia. Satu dupa satu harapan; ketulusan yang menjawab.',
      offeringRecordIncense: 'Dupa',
      offeringRecordLamp: 'Lampu',
      offeringRecordEmpty: 'Belum ada catatan persembahan',
      offeringMinute: '{m} menit',
      offeringCancel: 'Batal',
      offeringConfirm: 'Konfirmasi',
      offeringClose: 'Tutup',
      offeringReset: 'Reset status persembahan',
      offeringResetDone: 'Status persembahan direset',
      offeringNoAudio: 'Browser ini tidak mendukung audio',
      offeringPrevAria: 'Dewa sebelumnya',
      offeringNextAria: 'Dewa berikutnya',
      aboutNameBody: '“Yi” diambil dari “易” (perubahan) dalam I Ching dan juga melambangkan “一” (satu) — segala sesuatu kembali pada kesatuan, dengan kekekalan di tengah perubahan. “Num” mewakili angka, numerologi, dan komputasi, melambangkan pencarian teknologi modern atas pola. Yi-Num bukan sekadar alat, melainkan pendamping gaya hidup “Kearifan Timur + AI”.',
      aboutWhyTitle: 'Mengapa kami bermula',
      aboutWhyBody: 'Di era yang berubah cepat, manusia menghadapi semakin banyak pilihan — arah karier, komunikasi, ritme hidup, manajemen emosi, pemahaman diri… Sering yang mereka butuhkan bukan jawaban tunggal, melainkan perspektif lebih luas, mental lebih tenang, dan cara berpikir lebih terstruktur. Dengan AI, kami berharap membebaskan kebijaksanaan I Ching tentang perubahan dari teks yang sukar dipahami, lalu mengubahnya menjadi layanan cerdas yang bisa dipahami, dialami, dan digunakan setiap hari.',
      aboutWhatTitle: 'Apa yang kami lakukan',
      aboutCard1Title: 'Digitalisasi budaya I Ching',
      aboutCard1Desc: 'Menyusun dan mensistematisasi budaya tradisional — delapan trigram, enam puluh empat heksagram, yin-yang dan lima elemen, serta perhitungan citra-angka.',
      aboutCard2Title: 'Tanya jawab cerdas & interpretasi personal',
      aboutCard2Desc: 'Didukung LLM, membiarkan pengguna memahami pengetahuan I Ching, makna heksagram, dan logika perubahan dalam bahasa alami.',
      aboutCard3Title: 'Bantuan skenario hidup',
      aboutCard3Desc: 'Di sekitar kesadaran diri, komunikasi, perencanaan karier, keseimbangan emosi, dan ritme harian, kami menawarkan perspektif budaya untuk refleksi.',
      aboutCard4Title: 'Budaya & edukasi',
      aboutCard4Desc: 'Melalui artikel, kursus, dan pengalaman interaktif, kami mendorong penyebaran rasional dan ekspresi modern budaya I Ching.',
      aboutCard5Title: 'Layanan perusahaan & pengembang',
      aboutCard5Desc: 'Menjelajahi basis pengetahuan kearifan Timur, mesin interpretasi AI, dan kemampuan API untuk melayani lebih banyak skenario budaya dan komersial.',
      aboutMissionTitle: 'Misi',
      aboutMissionBody: 'Menjadikan kearifan Timur dipahami kembali, digunakan dengan mudah, dan diwariskan lebih baik di era AI.',
      aboutVisionTitle: 'Visi',
      aboutVisionBody: 'Menjadi platform AI kearifan Timur terkemuka di dunia, agar setiap orang dapat menemukan diri yang lebih tenang di dunia yang berubah.',
      aboutValuesTitle: 'Nilai kami',
      aboutVal1K: 'Integritas & inovasi',
      aboutVal1D: 'Menghormati akar budaya tradisional sekaligus merangkul teknologi modern.',
      aboutVal2K: 'Teknologi untuk kebaikan',
      aboutVal2D: 'Kami tidak menciptakan kecemasan, menyebarkan ketakutan, atau menjanjikan hasil fatalistik.',
      aboutVal3K: 'Rasional & menahan diri',
      aboutVal3D: 'Kami memperlakukan I Ching sebagai pembelajaran budaya, kesadaran diri, dan referensi hidup — bukan pengganti penilaian profesional.',
      aboutVal4K: 'Privasi utama',
      aboutVal4D: 'Kami menghargai keamanan dan privasi data pengguna.',
      aboutVal5K: 'Terbuka & berkolaborasi',
      aboutVal5D: 'Bersama pengguna, peneliti, lembaga budaya, dan mitra teknologi, kami mengeksplorasi nilai modern kearifan Timur.',
      aboutBoundaryTitle: 'Batas & tanggung jawab kami',
      aboutBoundaryBody: 'Konten Yi-Num terutama untuk pembelajaran budaya, referensi hiburan, pertumbuhan pribadi, dan inspirasi hidup. Ini tidak merupakan nasihat medis, hukum, keuangan, atau pernikahan. Kami menentang takhyul, penyebaran ketakutan, janji berlebihan, dan penjualan manipulatif. Kami berharap membiarkan budaya I Ching mendapat kehidupan yang lebih sehat dan awet di era digital — dengan rasional, hangat, dan bertanggung jawab.',
      aboutCopyright: '© 2026 YinumAI Limited. All rights reserved.'
    }
  };

  /* ---------------- 状态 ---------------- */
  var current = DEFAULT_LANG;
  var listeners = [];

  var langRoot = null;
  var langBtn = null;
  var langMenu = null;
  var langCurrent = null;
  var langOpts = null;

  /* ---------------- 取值 ---------------- */
  function lookup(key) {
    var dict = DICT[current];
    if (dict && dict[key] != null) return dict[key];
    var def = DICT[DEFAULT_LANG];
    if (def && def[key] != null) return def[key];
    return null;
  }

  function t(key, vars) {
    var str = lookup(key);
    if (str == null) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace('{' + k + '}', vars[k]);
      });
    }
    return str;
  }

  /* ---------------- 应用语言 ---------------- */
  function applyLang() {
    document.documentElement.lang = current;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = lookup(el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var v = lookup(el.getAttribute('data-i18n-ph'));
      if (v != null) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = lookup(el.getAttribute('data-i18n-aria'));
      if (v != null) el.setAttribute('aria-label', v);
    });

    if (langCurrent) {
      var meta = LANGS.filter(function (l) { return l.code === current; })[0];
      langCurrent.textContent = meta ? meta.label : current;
    }
    if (langOpts) {
      langOpts.forEach(function (btn) {
        btn.setAttribute('aria-selected', String(btn.getAttribute('data-lang') === current));
      });
    }

    listeners.forEach(function (fn) { fn(current); });
  }

  function setLang(code) {
    if (!DICT[code] || code === current) { closeMenu(); return; }
    current = code;
    try { localStorage.setItem(STORE_KEY, code); } catch (e) { /* 隐私模式忽略 */ }
    applyLang();
    closeMenu();
  }

  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* noop */ }
    if (saved && DICT[saved]) return saved;
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('id') === 0) return 'id';
    if (nav.indexOf('en') === 0) return 'en';
    return DEFAULT_LANG;
  }

  /* ---------------- 语言下拉 ---------------- */
  function openMenu() {
    if (!langMenu) return;
    langMenu.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    if (!langMenu || langMenu.hidden) return;
    langMenu.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
  }

  function bindSwitcher() {
    langRoot = document.getElementById('lang');
    langBtn = document.getElementById('langBtn');
    langMenu = document.getElementById('langMenu');
    langCurrent = document.getElementById('langCurrent');
    if (!langRoot || !langBtn || !langMenu) return;

    langOpts = langMenu.querySelectorAll('.lang-opt');

    langBtn.addEventListener('click', function () {
      if (langMenu.hidden) openMenu(); else closeMenu();
    });

    langMenu.addEventListener('click', function (e) {
      var btn = e.target.closest('.lang-opt');
      if (btn) setLang(btn.getAttribute('data-lang'));
    });

    document.addEventListener('click', function (e) {
      if (!langMenu.hidden && !langRoot.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (langMenu.hidden) return;
      if (e.key === 'Escape') { closeMenu(); langBtn.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var list = Array.prototype.slice.call(langOpts);
      var i = list.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown'
        ? (i + 1) % list.length
        : (i - 1 + list.length) % list.length;
      list[next].focus();
    });
  }

  /* ---------------- 对外接口 ---------------- */
  function init(onChange) {
    if (typeof onChange === 'function') listeners.push(onChange);
    bindSwitcher();
    current = detectLang();
    applyLang();
    return current;
  }

  return {
    init: init,
    t: t,
    getLang: function () { return current; },
    setLang: setLang,
    LANGS: LANGS
  };
})();
