/* =========================================================
   Yi-Num · 用户出生信息本地存取
   轻量封装：getUserData / saveUserData / clearUserData
   存储键：yinum.user
   数据形如：{ year, month, day, unknown, hour, gender }
   ========================================================= */
(function () {
  'use strict';
  var KEY = 'yinum.user';
  var UID_KEY = 'yinum.uid';        // 登录后写入的账号 ID（登录流程负责设置）
  var DID_KEY = 'yinum.deviceId';   // 匿名设备 ID（稳定的本地标识）

  /* 当前账号标识：登录态用 uid，匿名态用稳定的设备 ID（用于按账号隔离运势缓存） */
  function getAccountId() {
    try {
      var uid = localStorage.getItem(UID_KEY);
      if (uid) return uid;
      var did = localStorage.getItem(DID_KEY);
      if (!did) {
        did = 'dev_' + (window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now() + '_' + Math.random().toString(16).slice(2));
        localStorage.setItem(DID_KEY, did);
      }
      return did;
    } catch (e) {
      return 'anon';
    }
  }

  window.YiNumUser = {
    /* 读取本地用户数据，解析失败返回 null */
    getUserData: function () {
      try {
        var raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /* 保存（覆盖）用户数据 */
    saveUserData: function (data) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data || null));
      } catch (e) { /* 隐私模式 / 配额满：静默 */ }
    },

    /* 清除（如需「退出 / 重置」时调用） */
    clearUserData: function () {
      try {
        localStorage.removeItem(KEY);
      } catch (e) { /* 静默 */ }
    },

    /* 账号标识：登录后由登录流程写入 uid；返回当前用于隔离缓存的账号 ID */
    getAccountId: getAccountId,

    /* 登录成功后调用，传入账号 ID（如 uid / openid），后续运势缓存按该账号隔离 */
    setAccountId: function (id) {
      try { if (id) localStorage.setItem(UID_KEY, String(id)); } catch (e) { /* 静默 */ }
    }
  };
})();
