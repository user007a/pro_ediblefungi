/**
 * 食用菌工厂化平台 · 移动端共享数据层
 * --------------------------------------------------------------
 * 统一承载跨页面共享列表 + 离线同步队列，所有页面通过
 * <script src="js/mobile-store.js"></script> 引入即可使用。
 *
 * 解决的问题：
 *   1. 离线作业：离线写入的记录进入同步队列，联网后自动补传
 *   2. 跨端闭环：队列与共享列表写入 localStorage，PC 端
 *      （applefarm_backhand 的 mobile-bridge / mobile-ops-store）读同一份数据
 *
 * 存储键（均为 localStorage）：
 *   smartorchard_sync_queue  离线同步队列（键名为跨端契约，PC 端按此名读取，勿改名）
 *   业务台账键统一 mushroom_ 前缀，由各业务页自行读写（见 README 第 7 节）
 *
 * 暴露 API：
 *   MobileStore.ready            Promise，初始化完成
 *   MobileStore.onQueueChange(fn) 订阅队列变化
 *   MobileStore.enqueue(item)    入队一条待同步记录
 *   MobileStore.flush()          立即尝试同步
 *   MobileStore.pending()        待同步条数
 *   MobileStore.list(key)        读取某类共享列表
 *   MobileStore.push(key, item)  追加一条到共享列表并广播
 *   MobileStore.upsert(key,item) 按 id 覆盖或追加
 *   MobileStore.remove(key, id)  按 id 删除
 *   MobileStore.subscribe(fn)    订阅任意数据变化
 *   MobileStore.renderSyncBar(el) 渲染同步状态栏到指定容器
 *   MobileStore.toast(msg, type) 轻提示
 *   MobileStore.fmtTime(ts)      格式化时间戳
 */

(function (global) {
  'use strict';

  var KEYS = {
    queue: 'smartorchard_sync_queue'
  };

  var subs = [];
  var queueSubs = [];

  /* ---------------- 基础读写 ---------------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // 存储配额溢出等场景不应中断业务流程
      return false;
    }
  }

  function emit(reason) {
    subs.forEach(function (fn) {
      try { fn(reason); } catch (e) { /* 单个订阅者异常不影响其他 */ }
    });
  }

  function emitQueue() {
    queueSubs.forEach(function (fn) {
      try { fn(pending(), syncing); } catch (e) { /* 同上 */ }
    });
  }

  /* ---------------- 共享列表 ---------------- */

  function list(key) {
    var v = read(key, []);
    return Array.isArray(v) ? v : [];
  }

  function saveList(key, arr) {
    var ok = write(key, arr);
    emit(key);
    return ok;
  }

  function push(key, item) {
    var arr = list(key);
    item = item || {};
    if (!item.id) item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    if (!item.createTime) item.createTime = new Date().toISOString();
    arr.unshift(item);
    saveList(key, arr);
    return item;
  }

  function upsert(key, item) {
    var arr = list(key);
    if (!item || !item.id) return push(key, item);
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === item.id) { idx = i; break; }
    }
    if (idx >= 0) {
      arr[idx] = Object.assign({}, arr[idx], item);
      saveList(key, arr);
      return arr[idx];
    }
    return push(key, item);
  }

  function remove(key, id) {
    var arr = list(key).filter(function (x) { return x.id !== id; });
    saveList(key, arr);
  }

  /* ---------------- 离线同步队列（F-279~F-282） ---------------- */

  var syncing = false;

  function queue() { return read(KEYS.queue, []); }

  function pending() { return queue().length; }

  /**
   * 入队一条待同步记录。
   * 联网时直接标记为已同步；离线时保留在队列等待网络恢复。
   */
  function enqueue(item) {
    if (!item || !item.type) return null;
    var entry = Object.assign({}, item);
    if (!entry.id) entry.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    entry.queuedAt = entry.queuedAt || new Date().toISOString();
    entry.retry = entry.retry || 0;
    entry.status = 'pending';

    var arr = queue();
    arr.push(entry);
    write(KEYS.queue, arr);
    emitQueue();
    emit(KEYS.queue);

    // 在线时立即尝试同步，不让用户等待网络恢复
    if (isOnline()) flush();
    return entry;
  }

  function isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  /**
   * 同步队列。原型阶段无后端接口，此处模拟一次网络往返；
   * 有真实接口时只需把 simulateUpload 换成 fetch 即可，
   * 队列、状态栏、重试与去重逻辑无需改动。
   */
  function flush() {
    if (syncing || !isOnline()) return Promise.resolve({ ok: false, reason: 'offline' });
    var arr = queue();
    if (!arr.length) return Promise.resolve({ ok: true, count: 0 });

    syncing = true;
    emitQueue();

    return simulateUpload(arr).then(function (done) {
      if (!done || !done.length) {
        syncing = false;
        emitQueue();
        return { ok: false, reason: 'upload-failed' };
      }
      var okSet = {};
      done.forEach(function (e) { okSet[e.id] = true; });
      var rest = queue().filter(function (e) { return !okSet[e.id]; });
      write(KEYS.queue, rest);
      syncing = false;
      emitQueue();
      emit(KEYS.queue);
      return { ok: true, count: done.length, remain: rest.length };
    }).catch(function () {
      // 失败保留队列，下次网络恢复或用户手动触发时重试
      var rest = queue().map(function (e) {
        return Object.assign({}, e, { retry: (e.retry || 0) + 1 });
      });
      write(KEYS.queue, rest);
      syncing = false;
      emitQueue();
      return { ok: false, reason: 'error' };
    });
  }

  function simulateUpload(arr) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var stamp = new Date().toISOString();
        // 回写服务端确认时间，便于"已同步"追溯
        arr.forEach(function (e) { e.syncedAt = stamp; });
        resolve(arr);
      }, 400);
    });
  }

  function clearQueue() {
    write(KEYS.queue, []);
    emitQueue();
    emit(KEYS.queue);
  }

  /* ---------------- F-282 同步状态栏 ---------------- */

  function renderSyncBar(el) {
    if (!el) return;
    function paint() {
      var n = pending();
      var online = isOnline();
      var mode = !online ? 'offline' : (syncing ? 'syncing' : (n > 0 ? 'pending' : 'done'));
      var text, cls;
      if (mode === 'offline') {
        text = n > 0 ? ('离线 · ' + n + ' 条待同步') : '当前离线';
        cls = 'is-offline';
      } else if (mode === 'syncing') {
        text = '同步中…';
        cls = 'is-syncing';
      } else if (mode === 'pending') {
        text = n + ' 条待同步';
        cls = 'is-pending';
      } else {
        text = '数据已同步';
        cls = 'is-done';
      }
      el.className = 'mb-sync-bar ' + cls;
      el.innerHTML =
        '<span class="mb-sync-dot"></span>' +
        '<span class="mb-sync-text">' + text + '</span>' +
        (n > 0 && online ? '<button class="mb-sync-action" type="button" data-sync-now>立即同步</button>' : '');
    }
    paint();
    el.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-sync-now') !== null) flush();
    });
    queueSubs.push(paint);
  }

  /* ---------------- 轻提示 ---------------- */

  function toast(msg, type) {
    var t = type || 'info';
    var box = document.createElement('div');
    box.className = 'mb-toast mb-toast-' + t;
    box.textContent = msg;
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
    setTimeout(function () { box.classList.add('show'); }, 10);
    setTimeout(function () {
      box.classList.remove('show');
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 260);
    }, 2000);
  }

  function confirmBox(msg) {
    return global.confirm(msg);
  }

  /* ---------------- 时间格式化 ---------------- */

  function fmtTime(ts) {
    var d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return String(ts || '');
    var p = function (n) { return n < 10 ? '0' + n : n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 网络事件 ---------------- */

  function onNetworkChange() {
    if (isOnline()) {
      if (pending() > 0) {
        toast('网络已恢复，正在同步 ' + pending() + ' 条记录', 'info');
        flush();
      } else {
        toast('网络已恢复', 'success');
      }
    } else {
      toast('网络已断开，将转为离线暂存', 'warning');
    }
    emit('network');
  }

  /* ---------------- 初始化 ---------------- */

  var ready = new Promise(function (resolve) {
    function boot() {
      // 跨标签页同步
      global.addEventListener('storage', function (e) {
        if (!e.key) return;
        if (e.key === KEYS.queue) emitQueue();
        emit(e.key);
      });
      global.addEventListener('online', onNetworkChange);
      global.addEventListener('offline', onNetworkChange);

      // 页面载入时若已有积压且网络可用，自动补传
      if (pending() > 0 && isOnline()) flush();
      resolve(MobileStore);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  });

  var MobileStore = {
    KEYS: KEYS,
    ready: ready,

    list: list,
    push: push,
    upsert: upsert,
    remove: remove,
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },

    enqueue: enqueue,
    flush: flush,
    pending: pending,
    clearQueue: clearQueue,
    isOnline: isOnline,
    onQueueChange: function (fn) { queueSubs.push(fn); fn(pending(), syncing); return function () { queueSubs = queueSubs.filter(function (f) { return f !== fn; }); }; },

    renderSyncBar: renderSyncBar,
    toast: toast,
    confirm: confirmBox,
    fmtTime: fmtTime
  };

  global.MobileStore = MobileStore;
})(window);
