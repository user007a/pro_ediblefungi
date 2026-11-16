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

  ALERTS.forEach(function (a) { a.statusText = STATUS_TEXT[a.status] || a.status; });

  var KEY = 'mushroom_alerts_v1';
  var live = ALERTS;
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length) live = saved;
  } catch (e) { /* 隐私模式等场景回退内置种子 */ }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(live)); } catch (e) {}
    global.dispatchEvent(new CustomEvent('fungiAlertChange'));
  }

  global.FungiAlertData = {
    SOURCES: SOURCES,
    STATUS_TEXT: STATUS_TEXT,
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
      a.statusText = STATUS_TEXT[a.status] || a.status;
      persist();
      return a;
    },
    add: function (alert) {
      live.unshift(alert);
      alert.statusText = STATUS_TEXT[alert.status] || alert.status;
      persist();
      return alert;
    },
    reset: function () {
      live = ALERTS.map(function (a) { return Object.assign({}, a); });
      try { localStorage.removeItem(KEY); } catch (e) {}
      global.dispatchEvent(new CustomEvent('fungiAlertChange'));
    }
  };
})(window);