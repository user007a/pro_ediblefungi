/**
 * 消费者 H5 · 溯源展示环节数据层
 * --------------------------------------------------------------
 * 统一读取后台「溯源配置 - C 端展示配置」维护的环节清单（localStorage['h5_trace_stages']），
 * 后台未初始化时回退到内置默认清单，保证 H5 端可独立运行。
 *
 * 环节 key 为固定 7 值之一（与 h5_trace_detail.html 的详情内容一一对应，不可增删）：
 *   material 原料进厂 / substrate 菌包制备 / sterilize 灭菌接种 / incubate 发菌培养
 *   fruiting 出菇采收 / grading 分级预冷 / coldchain 冷链流通
 *
 * 暴露 API：
 *   TraceStages.ready          Promise，初始化完成
 *   TraceStages.all()          全部环节（按 order 排序）
 *   TraceStages.onSale()       启用中的环节（enabled ≠ false，按 order 排序）
 *   TraceStages.get(key)       按 key 取环节
 *   TraceStages.subscribe(fn)  订阅环节变更（含后台跨标签页更新）
 *   TraceStages.esc(s)         HTML 转义
 *   TraceStages.DEFAULT        内置默认清单
 */

(function (global) {
  'use strict';

  var KEY = 'h5_trace_stages';

  /* 与后台 trace_config.html「C端溯源展示」Tab 的 DEFAULT_CSTAGES 保持一致 */
  var DEFAULT_STAGES = [
    { key: 'material',   name: '原料进厂', title: '原料进厂', icon: '🌾', img: 'images/trace_material.jpg',   desc: '棉籽壳、玉米芯、麸皮等主辅料逐批验收，含水率与杂质抽检合格后入库', enabled: true, order: 1 },
    { key: 'substrate',  name: '菌包制备', title: '菌包制备', icon: '🧱', img: 'images/trace_substrate.jpg',  desc: '按配方自动计量拌料，含水率 62.3%、pH 7.2，装袋并称重抽检', enabled: true, order: 2 },
    { key: 'sterilize',  name: '灭菌接种', title: '灭菌接种', icon: '♨️', img: 'images/trace_sterilize.jpg',  desc: '121℃ 高压灭菌保温 120 分钟，冷却后于 A 级无菌接种室接种', enabled: true, order: 3 },
    { key: 'incubate',   name: '发菌培养', title: '发菌培养', icon: '🌡️', img: 'images/trace_incubate.jpg',   desc: '培养房 23.4℃ 避光培养 30 天，菌丝满袋率 98.6%，污染率 0.79%', enabled: true, order: 4 },
    { key: 'fruiting',   name: '出菇采收', title: '出菇采收', icon: '🍄', img: 'images/trace_fruiting.jpg',   desc: '出菇房 18.0℃、湿度 92.3%、CO₂ 685ppm，菇体成熟后人工采收', enabled: true, order: 5 },
    { key: 'grading',    name: '分级预冷', title: '分级预冷', icon: '📦', img: 'images/trace_grading.jpg',    desc: '按菌盖直径与形态分级，一级率 91.3%，0~4℃ 强制预冷至中心温度 3.2℃', enabled: true, order: 6 },
    { key: 'coldchain',  name: '冷链流通', title: '冷链流通', icon: '🚚', img: 'images/trace_coldchain.jpg',  desc: '全程 2~8℃ 冷链配送，车厢温度 5 分钟一采，运输曲线可查', enabled: true, order: 7 }
  ];

  var VALID_KEYS = DEFAULT_STAGES.map(function (s) { return s.key; });

  var subs = [];
  var cache = null;

  function normalize(list) {
    if (!Array.isArray(list)) return null;
    // 过滤非法 key，并按 order 升序
    var out = list.filter(function (s) {
      return s && typeof s === 'object' && VALID_KEYS.indexOf(s.key) >= 0;
    }).map(function (s) {
      // 后台「C 端溯源展示」写入的字段名为 title，此处兼容 name，保证两端字段名可互换
      var title = String(s.title || s.name || '');
      return {
        key: s.key,
        title: title,
        name: title,
        icon: String(s.icon || ''),
        img: String(s.img || ''),
        desc: String(s.desc || ''),
        enabled: s.enabled !== false,
        order: Number(s.order) || 0
      };
    });
    out.sort(function (a, b) { return a.order - b.order; });
    return out.length ? out : null;
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function all() {
    if (cache) return cache;
    var list = read();
    if (!list) {
      list = DEFAULT_STAGES.map(function (s) {
        var o = Object.assign({}, s);
        o.title = s.name;   // 与后台字段名对齐
        return o;
      });
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* 只读降级 */ }
    }
    cache = list;
    return cache;
  }

  function invalidate() {
    cache = null;
  }

  function emit() {
    invalidate();
    subs.forEach(function (fn) {
      try { fn(all()); } catch (e) { /* 单个订阅异常不影响其他 */ }
    });
  }

  global.addEventListener('storage', function (e) {
    if (e.key === KEY) emit();
  });

  global.TraceStages = {
    KEY: KEY,
    DEFAULT: DEFAULT_STAGES,
    all: all,
    onSale: function () {
      return all().filter(function (s) { return s.enabled !== false; });
    },
    get: function (key) {
      var list = all();
      for (var i = 0; i < list.length; i++) {
        if (list[i].key === key) return list[i];
      }
      return null;
    },
    subscribe: function (fn) {
      if (typeof fn === 'function') subs.push(fn);
    },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    ready: Promise.resolve(all())
  };
})(window);