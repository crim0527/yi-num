/* =========================================================
   Yi-Num · 统一登录客户端（方案 C：自建邮箱验证码 + Google 桥接）
   ---------------------------------------------------------
   登录方式：
   - 邮箱：6 位验证码，由 /api/auth 签发（邮件经 Resend 发送）；
           无状态 challenge + JWT，无需后端数据库。
   - Google：仍用 Firebase 弹窗获取 idToken，提交 /api/auth 校验后
            签发同一套会话令牌；同一邮箱 ⇒ 同一账号（自动关联）。
   账号以 email 归一（uid = 'acct_' + base64(email)），因此邮箱登录与
   Google 登录天然关联，providers 会在多次登录时合并。

   对外接口（保持与旧调用兼容）：
     mode() / getCurrentUserSync() / getCurrentUser() / saveUser() / clearUser()
     onUserChanged() / requireUser() / signOut() / init()
     sendEmailCode(email)           -> Promise<{challenge?, devCode?}>
     verifyEmailCode(email, code, challenge) -> Promise<user>
     signInWithGoogle({ link })      -> Promise<user>
   归一化用户对象：{ uid, email, providers:[...], token?, loginAt }
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'yinum.auth';
  var DEV_CODE_KEY = 'yinum.devcode:';

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  /* 线上（非本机）使用自建 /api/auth；本机调试走开发模式（本地生成验证码） */
  var useServer = !isLocal;

  var cfg = window.YiNumFirebaseConfig;
  var enabledFirebase = !!(window.YiNumFirebaseEnabled && cfg && window.firebase);

  var listeners = [];

  if (enabledFirebase) console.info('[Yi-Num Auth] Firebase 已就绪（仅用于 Google 弹窗）');
  if (useServer) console.info('[Yi-Num Auth] 线上模式：邮箱验证码走 /api/auth');
  else console.info('[Yi-Num Auth] 开发模式（本机调试，验证码本地回显）');

  function notify(user) { for (var i = 0; i < listeners.length; i++) listeners[i](user); }

  function b64(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return s; } }

  function uidOf(email) { return 'acct_' + b64(String(email || '').trim().toLowerCase()); }

  /* 写入登录态；若同 uid 已存在，则合并 providers（实现“关联”） */
  function setSession(user) {
    if (user) {
      var prev = readCache();
      if (prev && prev.uid === user.uid && prev.providers) {
        var merged = prev.providers.slice();
        (user.providers || []).forEach(function (p) { if (merged.indexOf(p) === -1) merged.push(p); });
        user.providers = merged;
      }
    }
    try { localStorage.setItem(KEY, JSON.stringify(user || null)); } catch (e) {}
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

  function normalize(email, providers, token) {
    return {
      uid: uidOf(email),
      email: email,
      providers: providers || [],
      token: token || null,
      loginAt: Date.now()
    };
  }

  /* ---------------- 开发模式（本机） ---------------- */
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

  /* ---------------- 自建 /api/auth ---------------- */
  function postAuth(payload) {
    return fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    });
  }

  /* ---------------- 对外接口 ---------------- */
  window.YiNumAuth = {
    mode: function () { return useServer ? 'server' : 'dev'; },

    onUserChanged: function (cb) { if (typeof cb === 'function') listeners.push(cb); },

    getCurrentUserSync: readCache,

    getCurrentUser: function () { return Promise.resolve(readCache()); },

    /* 发送邮箱验证码；返回 {challenge?, devCode?} */
    sendEmailCode: function (email) {
      email = String(email || '').trim().toLowerCase();
      if (useServer) {
        return postAuth({ action: 'send-code', email: email }).then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            return { challenge: res.data.challenge, devCode: res.data.devCode };
          }
          return Promise.reject(new Error((res.data && res.data.error) || 'send_failed'));
        });
      }
      return Promise.resolve({ devCode: devGenCode(email) });
    },

    /* 校验 6 位验证码；challenge 来自 sendEmailCode 的返回值（开发模式可传 null） */
    verifyEmailCode: function (email, code, challenge) {
      email = String(email || '').trim().toLowerCase();
      code = String(code || '').trim();
      if (!useServer) {
        if (!devCheckCode(email, code)) return Promise.reject(new Error('CODE_INVALID'));
        var u = normalize(email, ['email']);
        setSession(u);
        return Promise.resolve(u);
      }
      return postAuth({ action: 'verify-code', email: email, code: code, challenge: challenge }).then(function (res) {
        if (res.ok && res.data && res.data.token) {
          var user = normalize(email, ['email'], res.data.token);
          setSession(user);
          return user;
        }
        return Promise.reject(new Error('CODE_INVALID'));
      });
    },

    /* 已不再使用（无邮件链接模式） */
    handleEmailLink: function () { return Promise.resolve(null); },

    /* Google 登录；若已登录（opts.link）则关联到当前账号（同邮箱自动合并） */
    signInWithGoogle: function (opts) {
      opts = opts || {};
      if (enabledFirebase && window.firebase && firebase.auth) {
        var provider = new firebase.auth.GoogleAuthProvider();
        return firebase.auth().signInWithPopup(provider).then(function (res) {
          var fbUser = res.user;
          return fbUser.getIdToken().then(function (idToken) {
            return postAuth({ action: 'google', idToken: idToken }).then(function (r) {
              if (r.ok && r.data && r.data.token) {
                var user = normalize(fbUser.email, ['google.com'], r.data.token);
                setSession(user);
                return user;
              }
              return Promise.reject(new Error('GOOGLE_FAILED'));
            });
          });
        }).catch(function (err) { return Promise.reject(mapGoogleErr(err)); });
      }
      /* 开发模式模拟 */
      var cur = readCache();
      var uid = (cur && opts.link) ? cur.uid : ('google_' + Math.random().toString(36).slice(2, 10));
      var user = normalize(
        (cur && cur.email) ? cur.email : ('google.user.' + Date.now() + '@gmail.com'),
        (cur && cur.providers ? cur.providers.slice() : []).concat(['google.com'])
      );
      setSession(user);
      return Promise.resolve(user);
    },

    signOut: function () {
      if (enabledFirebase && window.firebase && firebase.auth) {
        try { firebase.auth().signOut(); } catch (e) {}
      }
      setSession(null);
      return Promise.resolve();
    },

    /* 兼容旧接口 */
    saveUser: function (user) { setSession(user); },
    clearUser: function () { try { localStorage.removeItem(KEY); } catch (e) {} },

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

  function mapGoogleErr(err) {
    var m = err && err.message;
    if (m === 'popup-closed-by-user') return new Error('GOOGLE_CANCELLED');
    return new Error('GOOGLE_FAILED');
  }

  /* 初始化入口 */
  window.YiNumAuth.init = function () { /* Firebase 仅用于弹窗，无需预初始化 */ };
})();
