/**
 * 食用菌后台演示预警数据源（过渡层）
 * 供 index.html 顶栏通知与 home.html 工作台共用；
 * 后续共享 Store 改造为食用菌语义后，由 AlertStore 接管。
 */
(function (global) {
  'use strict';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function at(offset, hm) { return dayKey(offset) + ' ' + hm; }

  var SOURCES = [
    { key: 'env',       text: '环境越限' },
    { key: 'device',    text: '设备故障' },
    { key: 'pollution', text: '污染超标' },
    { key: 'system',    text: '系统消息' }
  ];

  var STATUS_TEXT = { pending: '待处理', processing: '处理中', closed: '已闭环' };

  /* 四色分级 + 响应时效 + 通知渠道矩阵（规格 5.4） */
  var LEVEL_META = {
    urgent:    { name: '红色·紧急', color: 'red',    hex: '#e5484d', slaMin: 1, channels: ['站内', '短信', '电话', 'App推送'], escalate: '超时未响应自动升级至厂长' },
    important: { name: '橙色·重要', color: 'orange', hex: '#f5a623', slaMin: 3, channels: ['站内', '短信', 'App推送'], escalate: '超时未响应升级至生产主管' },
    reminder:  { name: '黄色·提醒', color: 'yellow', hex: '#f7c948', slaMin: 5, channels: ['站内', 'App推送'], escalate: '超时未处理转重要' },
    notice:    { name: '蓝色·提示', color: 'blue',   hex: '#3b82f6', slaMin: 30, channels: ['站内'], escalate: '—' }
  };
  var CHANNEL_MATRIX = [
    { level: '红色·紧急',站内: true, 短信: true, 电话: true, App推送: true, 大屏: true },
    { level: '橙色·重要',站内: true, 短信: true, 电话: false, App推送: true, 大屏: true },
    { level: '黄色·提醒',站内: true, 短信: false, 电话: false, App推送: true, 大屏: false },
    { level: '蓝色·提示',站内: true, 短信: false, 电话: false, App推送: false, 大屏: false }
  ];
  var CLOSURE_STEPS = ['派工', '响应', '措施', '复核', '关闭'];

  var ALERTS = [
    { id: 'FA-261116-01', title: 'GF-02 CO₂ 浓度超标', desc: '986ppm 超配方上限 800ppm 持续 6min，新风风机联动已启动', level: 'urgent',    source: 'env',       location: '出菇车间 · GF-02', time: at(0, '09:42'),  status: 'processing' },
    { id: 'FA-261116-02', title: '3号灭菌锅曲线缺口', desc: 'MJ-261115-03 灭菌中途断电，曲线缺口 12min，待人工复判', level: 'urgent',    source: 'device',    location: '灭菌车间 · MJ-03', time: at(0, '08:15'),  status: 'pending' },
    { id: 'FA-261116-03', title: 'GF-04 污染率接近阈值', desc: '菌丝培养污染率 2.8%，接近 3.0% 预警线，建议加密杂菌检查', level: 'important', source: 'pollution', location: '培养车间 · GF-04', time: at(0, '07:58'),  status: 'pending' },
    { id: 'FA-261116-04', title: '预冷区温度越限', desc: '冷库 A 区 5.6℃ 超预冷区上限 4℃，出库已阻断', level: 'important', source: 'env',       location: '冷链库区 · 预冷A', time: at(0, '06:47'),  status: 'pending' },
    { id: 'FA-261116-05', title: 'GF-05 层间温差偏大', desc: '层间温差 0.9℃，层架循环风机已定时运行 15min', level: 'reminder',  source: 'env',       location: '出菇车间 · GF-05', time: at(0, '05:30'),  status: 'processing' },
    { id: 'FA-261115-06', title: '2号加湿器离线', desc: '超声波雾化加湿器连续 3 周期无数据，判定离线并生成维修工单', level: 'important', source: 'device',    location: '出菇车间 · GF-03', time: at(-1, '22:18'), status: 'pending' },
    { id: 'FA-261115-07', title: 'GF-01 湿度接近下限', desc: 'RH 84% 接近配方下限 85%，雾化加湿联动复核通过', level: 'reminder',  source: 'env',       location: '出菇车间 · GF-01', time: at(-1, '16:05'), status: 'closed' },
    { id: 'FA-261115-08', title: '监管上报回执异常', desc: '省监管平台批次报文 2 条进入死信队列，待重发对账', level: 'notice',    source: 'system',    location: '监管对接', time: at(-1, '10:26'), status: 'pending' }
  ];

  function enrich(a) {
    a.statusText = STATUS_TEXT[a.status] || a.status;
    var m = LEVEL_META[a.level] || LEVEL_META.notice;
    a.color = m.color; a.colorHex = m.hex; a.levelName = m.name;
    a.slaMin = m.slaMin; a.channels = m.channels.slice(); a.escalate = m.escalate;
    if (!a.assignee) a.assignee = a.status === 'pending' ? '—' : '张才孙';
    if (!a.respondedAt) a.respondedAt = a.status === 'pending' ? null : a.time;
    if (!a.measures) a.measures = a.status === 'closed' ? '联动复核通过，恢复正常区间' : (a.status === 'processing' ? '已现场处置，持续监控中' : '');
    if (!a.reviewedAt) a.reviewedAt = a.status === 'closed' ? a.time : null;
    if (!a.closedAt) a.closedAt = a.status === 'closed' ? a.time : null;
    if (a.escalated == null) a.escalated = false;
    return a;
  }
  ALERTS.forEach(enrich);

  var KEY = 'mushroom_alerts_v1';
  var live = ALERTS;
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length) live = saved.map(enrich);
  } catch (e) { /* 隐私模式等场景回退内置种子 */ }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(live)); } catch (e) {}
    global.dispatchEvent(new CustomEvent('fungiAlertChange'));
  }

  global.FungiAlertData = {
    SOURCES: SOURCES,
    STATUS_TEXT: STATUS_TEXT,
    LEVEL_META: LEVEL_META,
    CHANNEL_MATRIX: CHANNEL_MATRIX,
    CLOSURE_STEPS: CLOSURE_STEPS,
    list: function () { return live.slice(); },
    get: function (id) { return live.filter(function (a) { return a.id === id; })[0] || null; },
    byStatus: function (statuses) {
      return live.filter(function (a) { return statuses.indexOf(a.status) >= 0; });
    },
    stats: function () {
      var s = { pending: 0, processing: 0, closed: 0 };
      live.forEach(function (a) { s[a.status] = (s[a.status] || 0) + 1; });
      return s;
    },
    update: function (id, patch) {
      var a = this.get(id);
      if (!a) return null;
      Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
      enrich(a);
      persist();
      return a;
    },
    add: function (alert) {
      live.unshift(enrich(alert));
      persist();
      return alert;
    },
    reset: function () {
      live = ALERTS.map(function (a) { return enrich(Object.assign({}, a)); });
      try { localStorage.removeItem(KEY) ; } catch (e) {}
      global.dispatchEvent(new CustomEvent('fungiAlertChange'));
    }
  };
})(window);