/**
 * 食用菌环境监测系统 · 消息通知共享数据层
 * --------------------------------------------------------------
 * 消息不单独造数据，直接聚合各业务页的真实存储：
 *   预警消息   ← localStorage['mushroom_alert_records']（mb_alert.html）
 *   设备故障   ← localStorage['mushroom_repair_orders']（mb_troubleshoot.html）
 *   任务消息   ← localStorage['mushroom_scan_jobs']（mb_label.html 扫码开工）
 *   系统消息   ← localStorage['mushroom_sys_messages']（本页种子公告）
 * 已读状态：localStorage['mushroom_msg_read']（消息 id 数组）
 *
 * 暴露 API（window.MobileMessages）：
 *   list(cat, unreadOnly)   消息列表（cat: ''/alert/device/task/system）
 *   get(id)                 按消息 id 取单条（含原始业务对象 raw）
 *   unreadCount()           未读总数
 *   markRead(id)            标记单条已读
 *   markAllRead()           全部标记已读
 *   disposeAlert(alertId, {measure,result,remark})
 *                           预警处置反馈（与 mb_alert.html 同口径，含转维修工单）
 *   relTime(t)              相对时间展示
 */
(function (global) {
  'use strict';

  var ALERT_KEY = 'mushroom_alert_records';
  var ORDER_KEY = 'mushroom_repair_orders';
  var SCAN_KEY = 'mushroom_scan_jobs';
  var SYS_KEY = 'mushroom_sys_messages';
  var READ_KEY = 'mushroom_msg_read';

  var CAT_TEXT = { alert: '预警', device: '设备故障', task: '任务', system: '系统' };
  var LEVEL_TEXT = { blue: '蓝色', yellow: '黄色', orange: '橙色', red: '红色' };
  var ALERT_STATUS_TEXT = { pending: '待处置', processing: '处置中', done: '已处置' };
  var ORDER_STATUS_TEXT = { pending: '待受理', repairing: '维修中', done: '已完成' };
  var URGENCY_TEXT = { normal: '一般', urgent: '紧急', stop: '停机' };
  var RESULT_TEXT = { restored: '已恢复', observe: '待观察', repair: '需转维修工单' };
  var URGENCY_BY_LEVEL = { red: 'stop', orange: 'urgent', yellow: 'normal', blue: 'normal' };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === '') return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function readList(key) {
    var v = read(key, []);
    return Array.isArray(v) ? v : [];
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function nowStr() {
    var d = new Date();
    return dateStr(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function getUser() {
    try { return sessionStorage.getItem('loginUser') || '李国强'; }
    catch (e) { return '李国强'; }
  }

  /* 预警种子与 mb_alert.html 保持一致（同一 id 规则，不会产生重复数据） */
  function seedAlerts() {
    var day = dateStr();
    var stamp = day.replace(/-/g, '');
    return [
      {
        id: 'AL-' + stamp + '-01', level: 'red', title: '一号出菇房温度超上限',
        house: '一号出菇房 GF-01', metric: '温度', current: '19.6℃', threshold: '上限 18.4℃',
        duration: '18 分钟', source: '温度传感器 T2', device: '温度传感器 T2', circuit: 'GF-01',
        status: 'pending', time: day + ' 09:12'
      },
      {
        id: 'AL-' + stamp + '-02', level: 'orange', title: '三号出菇房 CO₂ 浓度超上限',
        house: '三号出菇房 GF-03', metric: 'CO₂ 浓度', current: '1120ppm', threshold: '上限 800ppm',
        duration: '6 分钟', source: 'CO₂传感器 C1', device: 'CO₂传感器 C1', circuit: 'GF-03',
        status: 'processing', time: day + ' 08:47'
      },
      {
        id: 'AL-' + stamp + '-03', level: 'yellow', title: '二号出菇房湿度低于下限',
        house: '二号出菇房 GF-02', metric: '空气湿度', current: '86%', threshold: '下限 88%',
        duration: '12 分钟', source: '湿度传感器 H2', device: '湿度传感器 H2', circuit: 'GF-02',
        status: 'pending', time: day + ' 08:05'
      },
      {
        id: 'AL-' + stamp + '-04', level: 'blue', title: '五号加湿器通信延迟',
        house: '五号出菇房 GF-05', metric: '通信状态', current: '延迟 3 次', threshold: '延迟 ≤1 次',
        duration: '约 25 分钟', source: '网关 GW-05', device: '超声波加湿器 5#', circuit: 'GF-05',
        status: 'pending', time: day + ' 07:58'
      },
      {
        id: 'AL-' + stamp + '-05', level: 'orange', title: '二号循环风机故障停机',
        house: '二号出菇房 GF-02', metric: '设备运行', current: '已停机', threshold: '运行状态',
        duration: '9 分钟', source: '风机控制器 DO-05', device: '循环风机 2#', circuit: 'GF-02',
        status: 'pending', time: day + ' 07:30'
      }
    ];
  }

  function readAlerts() {
    var list = readList(ALERT_KEY);
    if (list.length) return list;
    var seed = seedAlerts();
    write(ALERT_KEY, seed);
    return seed;
  }

  function seedSysMessages() {
    var day = dateStr();
    var stamp = day.replace(/-/g, '');
    var y = new Date();
    y.setDate(y.getDate() - 1);
    var yesterday = dateStr(y);
    return [
      {
        id: 'SYS-' + stamp + '-01',
        title: '出菇期配方模板 V3.2 已下发',
        summary: '出菇期温度 16~20℃、湿度 88%~95%、CO₂ ≤800ppm、光照 100~200lux，已同步至各菇房控制器。',
        content: '生产主管已下发出菇期配方模板 V3.2：\n\n温度 16~20℃（步进 ±0.1℃）\n湿度 88%~95%RH（步进 ±1%RH）\nCO₂ ≤800ppm（步进 ±50ppm）\n光照 100~200lux（分段亮度 30%/60%）\n\n参数已下发至 1~8 号出菇房控制器并完成回读比对，触摸屏与平台显示一致。请各位操作工按新配方执行日常巡检，发现回读偏差及时上报。',
        time: day + ' 08:30', author: '生产主管 · 王建军'
      },
      {
        id: 'SYS-' + stamp + '-02',
        title: '无菌接种操作安全培训通知',
        summary: '本周五 15:00 在接种室 A 开展无菌操作与消毒规范培训，接种岗位人员必须参加。',
        content: '为降低接种污染率，定于本周五 15:00 在接种室 A 开展无菌操作培训。\n\n培训内容：\n1. 接种区洁净度等级与紫外消毒时长要求；\n2. 75% 酒精使用规范与工具灭菌流程；\n3. 污染袋识别与隔离处置。\n\n接种岗位人员必须参加，培训后进行实操考核，考核结果记入人员资质档案。',
        time: yesterday + ' 16:20', author: '质检部'
      },
      {
        id: 'SYS-' + stamp + '-03',
        title: '移动端 v3.1 升级公告',
        summary: '新增冷库出入库、杂菌识别与采收过磅模块，离线作业记录恢复网络后自动补传。',
        content: '移动端 v3.1 已发布：\n\n1. 新增冷库出入库：温区库位管理、追溯码段自动生成、温度越限阻断出库；\n2. 新增杂菌识别：拍照识别绿霉等污染，一键生成污染上报；\n3. 采收过磅支持一级/二级分级校验与 CS 单号；\n4. 离线作业记录本地缓存，网络恢复后自动补传，可在「我的」页查看待同步条数。\n\n如使用中遇到问题，请通过设备报修或联系车间主管反馈。',
        time: yesterday + ' 09:00', author: '平台运维'
      }
    ];
  }

  function readSysMessages() {
    var raw = localStorage.getItem(SYS_KEY);
    if (raw !== null) return readList(SYS_KEY);
    var seed = seedSysMessages();
    write(SYS_KEY, seed);
    return seed;
  }

  /* ---------------- 已读状态 ---------------- */

  function readSet() {
    var arr = readList(READ_KEY);
    var set = {};
    arr.forEach(function (id) { set[String(id)] = true; });
    return set;
  }

  function markRead(id) {
    var arr = readList(READ_KEY);
    if (arr.indexOf(String(id)) >= 0) return;
    arr.push(String(id));
    write(READ_KEY, arr.slice(-500));
  }

  /* ---------------- 消息聚合 ---------------- */

  function buildMessages() {
    var set = readSet();
    var list = [];

    readAlerts().forEach(function (a) {
      if (!a || !a.id) return;
      list.push({
        id: 'MSG-A-' + a.id, cat: 'alert', refId: a.id,
        title: a.title,
        desc: (a.house || '') + ' · ' + (a.metric || '') + ' 当前 ' + (a.current || '—') + '（' + (a.threshold || '—') + '）',
        time: a.time || '', level: a.level || 'blue', status: a.status || 'pending',
        raw: a
      });
    });

    readList(ORDER_KEY).forEach(function (o) {
      if (!o || !o.id) return;
      list.push({
        id: 'MSG-D-' + o.id, cat: 'device', refId: o.id,
        title: '维修工单 ' + o.id + ' · ' + (ORDER_STATUS_TEXT[o.status] || o.status || ''),
        desc: (o.device || '') + '（回路 ' + (o.circuit || '—') + '）：' + (o.desc || ''),
        time: o.repairTime || o.time || '', status: o.status || 'pending', urgency: o.urgency || 'normal',
        raw: o
      });
    });

    readList(SCAN_KEY).forEach(function (j) {
      if (!j || !j.id) return;
      list.push({
        id: 'MSG-T-' + j.id, cat: 'task', refId: j.id,
        title: '批次 ' + j.batch + ' 待完成「' + (j.stage || '工序') + '」台账',
        desc: (j.house || '') + ' · 开工 ' + (j.startTime || '') + ' · ' + (j.operator || ''),
        time: j.startTime || '', batch: j.batch, stage: j.stage || '',
        raw: j
      });
    });

    readSysMessages().forEach(function (s) {
      if (!s || !s.id) return;
      list.push({
        id: 'MSG-S-' + s.id, cat: 'system', refId: s.id,
        title: s.title, desc: s.summary || '', time: s.time || '',
        raw: s
      });
    });

    list.forEach(function (m) { m.read = !!set[m.id]; });
    list.sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });
    return list;
  }

  function list(cat, unreadOnly) {
    return buildMessages().filter(function (m) {
      if (cat && m.cat !== cat) return false;
      if (unreadOnly && m.read) return false;
      return true;
    });
  }

  function get(id) {
    var all = buildMessages();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === String(id)) return all[i];
    }
    return null;
  }

  function unreadCount() {
    return buildMessages().filter(function (m) { return !m.read; }).length;
  }

  function markAllRead() {
    var ids = buildMessages().map(function (m) { return m.id; });
    write(READ_KEY, ids.slice(-500));
  }

  /* ---------------- 预警处置反馈（与 mb_alert.html 同口径） ---------------- */

  function nextOrderNo(orders) {
    var prefix = 'WX-' + dateStr().replace(/-/g, '') + '-';
    var max = 0;
    orders.forEach(function (o) {
      if (!o || typeof o.id !== 'string' || o.id.indexOf(prefix) !== 0) return;
      var n = parseInt(o.id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var n = max + 1;
    return prefix + (n < 10 ? '0' + n : '' + n);
  }

  /**
   * 提交预警处置反馈。调用方负责表单校验与二次确认。
   * 返回 { ok, message, orderNo }；result='repair' 时同步生成维修工单。
   */
  function disposeAlert(alertId, feedback) {
    var alerts = readAlerts();
    var a = null;
    for (var i = 0; i < alerts.length; i++) {
      if (alerts[i].id === alertId) { a = alerts[i]; break; }
    }
    if (!a) return { ok: false, message: '未找到该预警记录' };
    if (a.status === 'done') return { ok: false, message: '该预警已处置，无需重复提交' };

    var user = getUser();
    var time = nowStr();
    var orderNo = '';

    a.status = 'done';
    a.handledBy = user;
    a.handledAt = time;
    a.measure = feedback.measure;
    a.result = feedback.result;
    a.remark = feedback.remark || '';

    if (feedback.result === 'repair') {
      var orders = readList(ORDER_KEY);
      orderNo = nextOrderNo(orders);
      orders.unshift({
        id: orderNo,
        device: a.device || a.source || a.title,
        circuit: a.circuit || a.house,
        urgency: URGENCY_BY_LEVEL[a.level] || 'normal',
        desc: a.title + '（当前 ' + a.current + '，' + a.threshold + '）' + (a.remark ? '；' + a.remark : ''),
        phone: '13800000002',
        reporter: user,
        time: time,
        photo: '',
        status: 'pending',
        fromAlert: a.id
      });
      write(ORDER_KEY, orders);
      a.repairOrderNo = orderNo;
    }

    write(ALERT_KEY, alerts);
    return {
      ok: true,
      orderNo: orderNo,
      message: orderNo ? '处置已提交，已转维修工单 ' + orderNo : '处置已提交'
    };
  }

  /* ---------------- 相对时间 ---------------- */

  function relTime(t) {
    if (!t) return '';
    var d = new Date(String(t).replace(/-/g, '/'));
    if (isNaN(d.getTime())) return String(t);
    var diff = Date.now() - d.getTime();
    if (diff < 0) return String(t).slice(5, 16);
    var min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    var hour = Math.floor(min / 60);
    if (hour < 24 && dateStr(d) === dateStr()) return hour + ' 小时前';
    var day = dateStr(d);
    var y = new Date();
    y.setDate(y.getDate() - 1);
    if (day === dateStr(y)) return '昨天 ' + String(t).slice(11, 16);
    return String(t).slice(5, 16);
  }

  global.MobileMessages = {
    CAT_TEXT: CAT_TEXT,
    LEVEL_TEXT: LEVEL_TEXT,
    ALERT_STATUS_TEXT: ALERT_STATUS_TEXT,
    ORDER_STATUS_TEXT: ORDER_STATUS_TEXT,
    URGENCY_TEXT: URGENCY_TEXT,
    RESULT_TEXT: RESULT_TEXT,
    list: list,
    get: get,
    unreadCount: unreadCount,
    markRead: markRead,
    markAllRead: markAllRead,
    disposeAlert: disposeAlert,
    relTime: relTime
  };
})(window);