/* =========================================================
   Yi-Num · 统一登录客户端
   ---------------------------------------------------------
   两种实现，按配置自动切换：
   - Firebase 模式（配置就绪 + Firebase SDK 已加载）：
       · 邮箱：无密码「邮件链接」登录（createUser / signIn 由 Firebase 自动判定）
       · Google：signInWithPopup；若已用邮箱登录则 linkWithPopup 关联同一账号
   - 开发模式（无凭证）：本地生成 6 位验证码并回显，verifyEmailCode 校验；
       Google 登录 / 关联为本地模拟，行为对齐真实模式

   对外接口（兼容旧调用）：
     mode() / getCurrentUserSync() / getCurrentUser() / saveUser() / clearUser()
     requireUser() / onUserChanged()
   新增：
     sendEmailCode(email)            -> Promise<devCode|undefined>
     verifyEmailCode(email, code)    -> Promise<user>   (仅开发模式)
     handleEmailLink(url)            -> Promise<user|null>
     signInWithGoogle({ link })      -> Promise<user>
     signOut()                      -> Promise<void>
     init()                         初始化（加载时调用）
   归一化用户对象：{ uid, email, providers:[...], loginAt }
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'yinum.auth';
  var DEV_CODE_KEY = 'yinum.devcode:';
  var LINK_EMAIL_KEY = 'yinum.emailForLink';

  var cfg = window.YiNumFirebaseConfig;
  var enabled = !!window.YiNumFirebaseEnabled && !!cfg && !!window.firebase;
  var fbAuth = null, googleProvider = null;
  var listeners = [];

  /* 安全兜底：开发模式（本地回显验证码）仅允许在本机调试；
     线上若 Firebase 未就绪，禁止假登录，避免任何人可随意登录任意邮箱 */
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var devAllowed = !enabled && isLocal;

  if (enabled) {
    console.info('[Yi-Num Auth] Firebase 模式');
  } else if (devAllowed) {
    console.info('[Yi-Num Auth] 开发模式（本机调试）');
  } else {
    console.warn('[Yi-Num Auth] 登录服务未配置：线上环境已禁用开发模式');
  }

  function notify(user) {
    for (var i = 0; i < listeners.length; i++) listeners[i](user);
  }

  /* 写入登录态 + 设置账号隔离 uid（供运势缓存按账号隔离） */
  function setSession(user) {
    try { localStorage.setItem(KEY, JSON.stringify(user || null)); } catch (e) { /* 隐私模式 */ }
    if (window.YiNumUser && user && user.uid) window.YiNumUser.setAccountId(user.uid);
    notify(user);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var u = JSON.parse(raw);
      return (u && (u.uid || u.email)) ? u : null;
    } catch (e) { return null; }
  }

  function normalizeFb(fbUser) {
    var provs = (fbUser.providerData || []).map(function (p) { return p.providerId; });
    return {
      uid: fbUser.uid,
      email: fbUser.email || null,
      providers: provs,
      loginAt: Date.now()
    };
  }

  /* ---------------- Firebase 初始化 ---------------- */
  function initFirebase() {
    if (fbAuth || !enabled) return;
    try {
      firebase.initializeApp(cfg);
      fbAuth = firebase.auth();
      googleProvider = new firebase.auth.GoogleAuthProvider();
      fbAuth.onAuthStateChanged(function (fbUser) {
        if (fbUser) setSession(normalizeFb(fbUser));
      });
    } catch (e) { enabled = false; }
  }

  /* ---------------- 开发模式 ---------------- */
  function devKey(email) { return DEV_CODE_KEY + String(email).trim().toLowerCase(); }

  function devGenCode(email) {
    var code = String(Math.floor(100000 + Math.random() * 900000));
    try { localStorage.setItem(devKey(email), JSON.stringify({ code: code, ts: Date.now() })); } catch (e) {}
    console.log('[Yi-Num Dev] 邮箱 ' + email + ' 的登录验证码：' + code);
    return code;
  }

  function devCheckCode(email, code) {
    try {
      var raw = localStorage.getItem(devKey(email));
      if (!raw) return false;
      var o = JSON.parse(raw);
      return !!(o && o.code === String(code).trim());
    } catch (e) { return false; }
  }

  function b64(s) {
    try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return s; }
  }

  /* ---------------- 对外接口 ---------------- */
  window.YiNumAuth = {
    mode: function () { return enabled ? 'firebase' : (devAllowed ? 'dev' : 'unconfigured'); },

    onUserChanged: function (cb) { if (typeof cb === 'function') listeners.push(cb); },

    getCurrentUserSync: readCache,

    getCurrentUser: function () {
      if (enabled && fbAuth && fbAuth.currentUser) {
        return Promise.resolve(normalizeFb(fbAuth.currentUser));
      }
      return Promise.resolve(readCache());
    },

    /* 发送邮箱验证码（开发模式） / 登录链接（Firebase） */
    sendEmailCode: function (email) {
      if (enabled && fbAuth) {
        var settings = {
          url: location.href.split('?')[0] + '?mode=emailLink',
          handleCodeInApp: true
        };
        try { localStorage.setItem(LINK_EMAIL_KEY, email); } catch (e) {}
        return fbAuth.sendSignInLinkToEmail(email, settings)
          .then(function () { return undefined; })
          .catch(function (err) { return Promise.reject(err); });
      }
      if (!devAllowed) return Promise.reject(new Error('AUTH_NOT_CONFIGURED'));
      return Promise.resolve(devGenCode(email));
    },

    /* 校验 6 位验证码（仅开发模式可用） */
    verifyEmailCode: function (email, code) {
      if (enabled) return Promise.reject(new Error('EMAIL_LINK_MODE'));
      if (!devAllowed) return Promise.reject(new Error('AUTH_NOT_CONFIGURED'));
      if (!devCheckCode(email, code)) return Promise.reject(new Error('CODE_INVALID'));
      var user = {
        uid: 'email_' + b64(email),
        email: email,
        providers: ['password'],
        loginAt: Date.now()
      };
      setSession(user);
      return Promise.resolve(user);
    },

    /* 处理邮件链接登录回调（Firebase 模式，页面加载时调用） */
    handleEmailLink: function (url) {
      if (!enabled || !fbAuth || !fbAuth.isSignInWithEmailLink(url)) {
        return Promise.resolve(null);
      }
      var email = null;
      try { email = localStorage.getItem(LINK_EMAIL_KEY); } catch (e) {}
      if (!email) return Promise.reject(new Error('EMAIL_REQUIRED'));
      return fbAuth.signInWithEmailLink(email, url).then(function (res) {
        try { localStorage.removeItem(LINK_EMAIL_KEY); } catch (e) {}
        setSession(normalizeFb(res.user));
        return res.user;
      });
    },

    /* Google 登录；若已登录（opts.link）则关联到当前账号 */
    signInWithGoogle: function (opts) {
      opts = opts || {};
      if (enabled && fbAuth) {
        if (opts.link && fbAuth.currentUser) {
          return fbAuth.currentUser.linkWithPopup(googleProvider)
            .then(function (res) { setSession(normalizeFb(res.user)); return res.user; });
        }
        return fbAuth.signInWithPopup(googleProvider)
          .then(function (res) { setSession(normalizeFb(res.user)); return res.user; });
      }
      /* 开发模式模拟 */
      if (!devAllowed) return Promise.reject(new Error('AUTH_NOT_CONFIGURED'));
      var cur = readCache();
      var uid = (cur && opts.link) ? cur.uid : ('google_' + Math.random().toString(36).slice(2, 10));
      var user = {
        uid: uid,
        email: (cur && cur.email) ? cur.email : ('google.user.' + Date.now() + '@gmail.com'),
        providers: (cur && cur.providers ? cur.providers.slice() : []).concat(['google.com']),
        loginAt: Date.now()
      };
      setSession(user);
      return Promise.resolve(user);
    },

    signOut: function () {
      if (enabled && fbAuth) return fbAuth.signOut().then(function () { setSession(null); });
      setSession(null);
      return Promise.resolve();
    },

    /* 兼容旧接口 */
    saveUser: function (user) { setSession(user); },
    clearUser: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (enabled && fbAuth) { try { fbAuth.signOut(); } catch (e) {} }
    },
    requireUser: function (successUrl, loginUrl) {
      return this.getCurrentUser().then(function (user) {
        window.location.href = user ? successUrl : loginUrl;
        return user;
      }).catch(function () {
        window.location.href = loginUrl;
        return null;
      });
    }
  };

  /* 初始化入口（login.js 在脚本加载后调用） */
  window.YiNumAuth.init = function () { if (enabled) initFirebase(); };
})();
