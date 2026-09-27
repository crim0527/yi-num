/* =========================================================
   Yi-Num · Login
   表单校验 + 验证码倒计时（i18n 由共享 i18n.js 提供）
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- DOM ---------------- */
  var form = document.getElementById('loginForm');
  var email = document.getElementById('email');
  var code = document.getElementById('code');
  var codeRow = document.getElementById('codeRow');
  var sendBtn = document.getElementById('sendCode');
  var emailError = document.getElementById('emailError');
  var codeError = document.getElementById('codeError');
  var sentHint = document.getElementById('sentHint');
  var googleBtn = document.getElementById('googleBtn');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var CODE_RE = /^\d{6}$/;

  /* ---------------- i18n ---------------- */
  function t(key, vars) {
    return window.YiNumI18n ? window.YiNumI18n.t(key, vars) : key;
  }

  /* ---------------- 状态 ---------------- */
  var state = {
    emailError: null,   // i18n key
    codeError: null,    // i18n key
    sentTo: null,       // email 地址
    devCode: null,      // 开发模式回显的验证码
    countdown: 0,
    timer: null
  };

  /* ---------------- 校验提示 ---------------- */
  function renderMessages() {
    if (state.emailError) {
      emailError.textContent = t(state.emailError);
      emailError.hidden = false;
      email.setAttribute('aria-invalid', 'true');
    } else {
      emailError.hidden = true;
      emailError.textContent = '';
      email.removeAttribute('aria-invalid');
    }

    if (state.codeError) {
      codeError.textContent = t(state.codeError);
      codeError.hidden = false;
      codeRow.classList.add('is-invalid');
      code.setAttribute('aria-invalid', 'true');
    } else {
      codeError.hidden = true;
      codeError.textContent = '';
      codeRow.classList.remove('is-invalid');
      code.removeAttribute('aria-invalid');
    }

    if (state.sentTo) {
      var txt = (isLinkMode() ? t('sentToLink') : t('sentTo')) + state.sentTo;
      if (state.devCode) txt += t('devCodeHint', { code: state.devCode });
      sentHint.textContent = txt;
      sentHint.hidden = false;
    } else {
      sentHint.hidden = true;
      sentHint.textContent = '';
    }
  }

  function validateEmail() {
    var v = email.value.trim();
    if (!v) { state.emailError = 'errEmailRequired'; return false; }
    if (!EMAIL_RE.test(v)) { state.emailError = 'errEmailInvalid'; return false; }
    state.emailError = null;
    return true;
  }

  function validateCode() {
    var v = code.value.trim();
    if (!v) { state.codeError = 'errCodeRequired'; return false; }
    if (!CODE_RE.test(v)) { state.codeError = 'errCodeInvalid'; return false; }
    state.codeError = null;
    return true;
  }

  /* ---------------- 模式判断 ---------------- */
  /* Firebase 邮件链接模式：没有 6 位验证码，发送的是「登录链接」邮件 */
  function isLinkMode() {
    return !!(window.YiNumAuth && YiNumAuth.mode && YiNumAuth.mode() === 'firebase');
  }

  /* 依据模式调整 UI（链接模式隐藏验证码输入框，主按钮改为“发送登录链接”） */
  function applyModeUI() {
    var link = isLinkMode();
    var field = codeRow ? codeRow.parentNode : null;
    if (field && field.classList && field.classList.contains('field')) {
      field.hidden = link;
      field.style.display = link ? 'none' : '';
    }
    var submitBtn = form ? form.querySelector('.auth-submit') : null;
    if (submitBtn) submitBtn.textContent = link ? t('sendLink') : t('login');
    renderSendButton();
  }

  /* ---------------- 验证码倒计时 ---------------- */
  function renderSendButton() {
    if (state.countdown > 0) sendBtn.textContent = t('resendIn', { s: state.countdown });
    else sendBtn.textContent = isLinkMode() ? t('sendLink') : t('sendCode');
  }

  function startCountdown() {
    state.countdown = 60;
    sendBtn.disabled = true;
    renderSendButton();
    state.timer = setInterval(function () {
      state.countdown -= 1;
      if (state.countdown <= 0) {
        clearInterval(state.timer);
        state.timer = null;
        sendBtn.disabled = false;
      }
      renderSendButton();
    }, 1000);
  }

  /* 发送登录链接（Firebase 模式）/ 验证码（开发模式） */
  function sendLoginLink() {
    if (!validateEmail()) { renderMessages(); email.focus(); return; }
    var addr = email.value.trim();
    sendBtn.disabled = true;
    YiNumAuth.sendEmailCode(addr).then(function (devCode) {
      state.sentTo = addr;
      state.devCode = devCode || null;
      renderMessages();
      startCountdown();
    }).catch(function (err) {
      sendBtn.disabled = false;
      try { console.error('[Yi-Num Auth] send sign-in link failed:', err && (err.code || err.message) || err); } catch (e) {}
      var m = err && err.message;
      state.emailError = (m === 'AUTH_NOT_CONFIGURED') ? 'errAuthNotConfigured' : 'errSendFailed';
      renderMessages();
    });
  }

  sendBtn.addEventListener('click', function () { sendLoginLink(); });

  email.addEventListener('input', function () {
    if (state.emailError) { state.emailError = null; renderMessages(); }
  });

  code.addEventListener('input', function () {
    code.value = code.value.replace(/\D/g, '').slice(0, 6);
    if (state.codeError) { state.codeError = null; renderMessages(); }
  });

  /* ---------------- 提交 ---------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var okEmail = validateEmail();
    if (!okEmail) { renderMessages(); email.focus(); return; }

    // Firebase 邮件链接模式：无需验证码，提交即发送登录链接
    if (isLinkMode()) {
      state.codeError = null;
      state.emailError = null;
      sendLoginLink();
      return;
    }

    var okCode = validateCode();
    renderMessages();
    if (!okCode) { code.focus(); return; }

    var account = email.value.trim();

    YiNumAuth.verifyEmailCode(account, code.value.trim()).then(function () {
      window.location.href = 'destiny.html';
    }).catch(function (err) {
      var m = err && err.message;
      state.codeError = (m === 'AUTH_NOT_CONFIGURED') ? 'errAuthNotConfigured'
        : (m === 'CODE_INVALID') ? 'errCodeInvalid'
        : 'errSendFailed';
      renderMessages();
    });
  });

  /* ---------------- Google 登录 / 关联 ---------------- */
  googleBtn.addEventListener('click', function () {
    googleBtn.disabled = true;
    // 已登录（如邮箱）时点击 → 关联到当前账号；否则直接用 Google 登录
    var link = !!YiNumAuth.getCurrentUserSync();
    YiNumAuth.signInWithGoogle({ link: link }).then(function () {
      window.location.href = 'destiny.html';
    }).catch(function (err) {
      googleBtn.disabled = false;
      try { console.error('[Yi-Num Auth] Google sign-in failed:', err && (err.code || err.message) || err); } catch (e) {}
      var m = err && err.message;
      if (m === 'AUTH_NOT_CONFIGURED') {
        state.codeError = 'errAuthNotConfigured';
        renderMessages();
      } else if (m && String(m).indexOf('popup-closed') === -1) {
        // 用户主动关闭弹窗不提示；其余错误给出通用提示
        state.codeError = 'errGoogleFailed';
        renderMessages();
      }
    });
  });

  /* ---------------- init ---------------- */
  if (window.YiNumI18n) {
    window.YiNumI18n.init(function () {
      renderMessages();
      renderSendButton();
      applyModeUI();
    });
  }

  // 初始化认证客户端，并处理 Firebase 邮件链接登录回调
  if (window.YiNumAuth) {
    YiNumAuth.init();
    applyModeUI();
    YiNumAuth.handleEmailLink(location.href).then(function (user) {
      if (user) window.location.href = 'destiny.html';
    }).catch(function () { /* 邮箱链接模式需先输入邮箱，忽略 */ });
  }
})();
