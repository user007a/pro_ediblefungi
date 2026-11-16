(function (global) {
  'use strict';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function at(offset, hm) { return dayKey(offset) + ' ' + hm; }
  function nowStamp() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 灭菌曲线：自动采集时序点 {t, temp, press, p:[3 探头]}，合格判定取保温段最低点。
   * gap=true 时中段丢点（temp/press/p 置 null），标记曲线不完整，须人工复判。 */
  function curve(hold, gap) {
    var pts = [], t = 0, temp = 24;
    for (var i = 0; i < 14; i++) {
      t += 15;
      if (i < 4) temp = 24 + i * 26;
      else if (i < 10) temp = 121 + (i % 2 ? 0.4 : -0.3);
      else temp = 121 - (i - 9) * 22;
      var press = +(Math.max(0, (temp - 100) * 0.006 + 0.02)).toFixed(3);
      var probes = [+(temp + 0.2).toFixed(1), +(temp - 0.1).toFixed(1), +(temp - 0.5).toFixed(1)];
      if (gap && i >= 6 && i <= 7) { temp = null; press = null; probes = null; }
      pts.push({ t: t, temp: temp, press: press, p: probes });
    }
    return pts;
  }
  /* 保温段最低探头温度（多点取最低判定） */
  function curveMinTemp(pts) {
    var min = null;
    (pts || []).forEach(function (pt) {
      if (pt && pt.p && pt.temp != null && pt.temp >= 118) {
        var lo = Math.min.apply(null, pt.p);
        if (min == null || lo < min) min = lo;
      }
    });
    return min;
  }
  function curveComplete(pts) {
    var total = (pts || []).length, miss = 0;
    (pts || []).forEach(function (pt) { if (!pt || pt.temp == null) miss++; });
    return { auto: true, points: total, missing: miss, lossRate: total ? +(miss * 100 / total).toFixed(1) : 0, complete: miss === 0 };
  }
  /* 五级空间模型：厂区→车间→出菇房→层架→架位，编号唯一、建档后不可删除只能停用 */
  function buildSpaces() {
    var out = [];
    function node(code, name, level, parent, status, extra) {
      var o = { id: code, code: code, name: name, level: level, parent: parent || null, status: status || '启用', version: 'v1.0', inProd: false };
      if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      out.push(o); return o;
    }
    node('TK01', '托克逊数字农业厂区', 1, null, '启用', { area: 12000, capacity: '年产鲜菇 8600t' });
    var shops = [
      ['BD', '拌料车间'], ['MJ', '灭菌车间'], ['JZ', '接种车间'],
      ['PY', '培养车间'], ['GY', '出菇车间'], ['LL', '冷链车间']
    ];
    shops.forEach(function (s) { node('TK01-' + s[0], s[1], 2, 'TK01', '启用', { area: 600 }); });
    var roomDefs = [
      ['GF01', 'GF-01 平菇出菇房', 6, true], ['GF02', 'GF-02 杏鲍菇出菇房', 6, true],
      ['GF03', 'GF-03 金针菇出菇房', 8, true], ['GF04', 'GF-04 香菇出菇房', 6, true],
      ['GF05', 'GF-05 平菇出菇房', 6, true], ['GF06', 'GF-06 杏鲍菇出菇房', 6, true],
      ['GF07', 'GF-07 空置菇房', 6, false], ['GF08', 'GF-08 空置菇房', 6, false]
    ];
    roomDefs.forEach(function (r) {
      var roomCode = 'TK01-GY-' + r[0];
      node(roomCode, r[1], 3, 'TK01-GY', r[3] ? '启用' : '停用', { area: 320, inProd: r[3] });
      for (var L = 1; L <= r[2]; L++) {
        var rackCode = roomCode + '-L' + L;
        node(rackCode, 'L' + L + ' 层架', 4, roomCode, r[3] ? '启用' : '停用', { inProd: r[3] });
        for (var A = 1; A <= 8; A++) {
          var pos = 'A' + (A < 10 ? '0' + A : A);
          node(rackCode + '-' + pos, pos + ' 架位', 5, rackCode, r[3] ? '启用' : '停用', { inProd: r[3] && A <= 6 });
        }
      }
    });
    return out;
  }

  var SEED = {
    rooms: [
      { id: 'GF-01', name: 'GF-01 平菇出菇房', variety: '平菇', strain: 'EG-01', status: '在产', flush: 2, area: 320, racks: 6 },
      { id: 'GF-02', name: 'GF-02 杏鲍菇出菇房', variety: '杏鲍菇', strain: 'EG-02', status: '在产', flush: 2, area: 320, racks: 6 },
      { id: 'GF-03', name: 'GF-03 金针菇出菇房', variety: '金针菇', strain: 'EG-03', status: '在产', flush: 1, area: 280, racks: 8 },
      { id: 'GF-04', name: 'GF-04 香菇出菇房', variety: '香菇', strain: 'EG-04', status: '在产', flush: 2, area: 300, racks: 6 },
      { id: 'GF-05', name: 'GF-05 平菇出菇房', variety: '平菇', strain: 'EG-01', status: '在产', flush: 2, area: 320, racks: 6 },
      { id: 'GF-06', name: 'GF-06 杏鲍菇出菇房', variety: '杏鲍菇', strain: 'EG-02', status: '在产', flush: 2, area: 320, racks: 6 },
      { id: 'GF-07', name: 'GF-07 空置菇房', variety: '—', strain: '—', status: '消杀中', flush: 0, area: 320, racks: 6 },
      { id: 'GF-08', name: 'GF-08 空置菇房', variety: '—', strain: '—', status: '消杀中', flush: 0, area: 320, racks: 6 }
    ],
    zones: [
      { id: 'BD-01', name: '拌料车间', type: '生产', area: 460, capacity: '拌料 12t/日', design: '粉尘 ≤ 4mg/m³', status: '运行' },
      { id: 'MJ-W', name: '灭菌车间', type: '生产', area: 380, capacity: '灭菌锅 4 台', design: '121°C / 0.12MPa', status: '运行' },
      { id: 'JZ-01', name: '无菌接种室', type: '生产', area: 120, capacity: '接种 2 万袋/日', design: '洁净度 100 级', status: '运行' },
      { id: 'PY-01', name: '菌丝培养车间', type: '生产', area: 900, capacity: '培养 60 万袋', design: '22-25°C 避光', status: '运行' },
      { id: 'GF-01', name: 'GF-01 平菇出菇房', type: '出菇', area: 320, capacity: '4.2 万袋', design: '15-20°C / RH85-95% / CO₂<800ppm', status: '在产' },
      { id: 'GF-02', name: 'GF-02 杏鲍菇出菇房', type: '出菇', area: 320, capacity: '3.8 万袋', design: '14-18°C / RH85-95% / CO₂<800ppm', status: '在产' },
      { id: 'GF-03', name: 'GF-03 金针菇出菇房', type: '出菇', area: 280, capacity: '4.0 万袋', design: '10-14°C / RH90-95% / CO₂<600ppm', status: '在产' },
      { id: 'GF-04', name: 'GF-04 香菇出菇房', type: '出菇', area: 300, capacity: '3.6 万袋', design: '12-18°C / RH85-90% / CO₂<800ppm', status: '在产' },
      { id: 'GF-05', name: 'GF-05 平菇出菇房', type: '出菇', area: 320, capacity: '4.2 万袋', design: '15-20°C / RH85-95% / CO₂<800ppm', status: '在产' },
      { id: 'GF-06', name: 'GF-06 杏鲍菇出菇房', type: '出菇', area: 320, capacity: '3.8 万袋', design: '14-18°C / RH85-95% / CO₂<800ppm', status: '在产' },
      { id: 'GF-07', name: 'GF-07 空置菇房', type: '出菇', area: 320, capacity: '4.2 万袋', design: '15-20°C / RH85-95%', status: '消杀中' },
      { id: 'GF-08', name: 'GF-08 空置菇房', type: '出菇', area: 320, capacity: '4.2 万袋', design: '15-20°C / RH85-95%', status: '消杀中' },
      { id: 'YL-01', name: '预冷区', type: '冷链', area: 150, capacity: '预冷 8t/日', design: '0-4°C', status: '温度越限' },
      { id: 'LK-A', name: '冷库 A', type: '冷链', area: 260, capacity: '冷藏 40t', design: '2-4°C', status: '运行' },
      { id: 'LK-B', name: '冷库 B', type: '冷链', area: 260, capacity: '冷藏 40t', design: '2-4°C', status: '运行' }
    ],
    strains: [
      { id: 'EG-01', variety: '平菇', latin: 'Pleurotus ostreatus', generation: '栽培种', mother: 'P-2023-01', storage: '菌种库 4°C', activated: at(-40, '09:00'), bags: 42000, status: '在用', form: '固体', supplier: 'SP-01', tempRange: '15-22°C', phRange: '6.5-7.5', batchNo: 'JZ-2026-011', productionDate: at(-40, '00:00'), expiry: at(140, '00:00'), report: 'JT-2026-011（合格）', stock: 42000 },
      { id: 'EG-02', variety: '杏鲍菇', latin: 'Pleurotus eryngii', generation: '栽培种', mother: 'E-2023-04', storage: '菌种库 4°C', activated: at(-35, '09:00'), bags: 38000, status: '在用', form: '固体', supplier: 'SP-01', tempRange: '14-18°C', phRange: '6.0-7.0', batchNo: 'JZ-2026-024', productionDate: at(-35, '00:00'), expiry: at(145, '00:00'), report: 'JT-2026-024（合格）', stock: 38000 },
      { id: 'EG-03', variety: '金针菇', latin: 'Flammulina velutipes', generation: '栽培种', mother: 'F-2024-02', storage: '菌种库 4°C', activated: at(-28, '09:00'), bags: 40000, status: '在用', form: '液体', supplier: 'SP-02', tempRange: '10-14°C', phRange: '5.5-6.5', batchNo: 'JZ-2026-037', productionDate: at(-28, '00:00'), expiry: at(152, '00:00'), report: 'JT-2026-037（合格）', stock: 40000 },
      { id: 'EG-04', variety: '香菇', latin: 'Lentinula edodes', generation: '栽培种', mother: 'L-2023-11', storage: '菌种库 4°C', activated: at(-52, '09:00'), bags: 36000, status: '在用', form: '固体', supplier: 'SP-02', tempRange: '12-18°C', phRange: '5.5-6.5', batchNo: 'JZ-2026-052', productionDate: at(-52, '00:00'), expiry: at(128, '00:00'), report: 'JT-2026-052（合格）', stock: 36000 }
    ],
    materials: [
      { id: 'M-01', name: '木屑', category: '原料', spec: '阔叶木粗屑 含水率≤15%', unit: 'kg', stock: 26800, safety: 12000, supplier: 'SP-03', supplierName: '湘西北林业合作社', price: 0.62, batchNo: 'YL-261101', origin: '湖南张家界', qc: '合格' },
      { id: 'M-02', name: '麦麸', category: '原料', spec: '中片新鲜', unit: 'kg', stock: 7400, safety: 4000, supplier: 'SP-04', supplierName: '常德粮油副产公司', price: 2.15, batchNo: 'YL-261102', origin: '湖南常德', qc: '合格' },
      { id: 'M-03', name: '玉米芯', category: '原料', spec: '粉碎 5-8mm', unit: 'kg', stock: 9200, safety: 5000, supplier: 'SP-05', supplierName: '豫东秸秆合作社', price: 0.85, batchNo: 'YL-261103', origin: '河南商丘', qc: '合格' },
      { id: 'M-04', name: '棉籽壳', category: '原料', spec: '中绒中壳', unit: 'kg', stock: 3600, safety: 4000, supplier: 'SP-06', supplierName: '新疆棉业副产公司', price: 1.45, batchNo: 'YL-261104', origin: '新疆阿克苏', qc: '待检' },
      { id: 'M-05', name: '菌袋', category: '菌袋', spec: '17×33cm PP', unit: '只', stock: 186000, safety: 80000, supplier: 'SP-07', supplierName: '台州塑业包装厂', price: 0.09, batchNo: 'JD-261105', origin: '浙江台州', qc: '合格' },
      { id: 'M-06', name: '生石灰', category: '辅料', spec: '生石灰粉 纯度≥90%', unit: 'kg', stock: 1500, safety: 600, supplier: 'SP-08', supplierName: '本地建材化验级', price: 0.95, batchNo: 'FL-261106', origin: '湖南长沙', qc: '合格' },
      { id: 'M-07', name: '轻质碳酸钙', category: '辅料', spec: '纯度≥98%', unit: 'kg', stock: 820, safety: 300, supplier: 'SP-08', supplierName: '本地建材化验级', price: 1.20, batchNo: 'FL-261107', origin: '湖南长沙', qc: '合格' },
      { id: 'M-08', name: '石膏', category: '辅料', spec: 'CaSO₄·2H₂O', unit: 'kg', stock: 640, safety: 250, supplier: 'SP-08', supplierName: '本地建材化验级', price: 0.80, batchNo: 'FL-261108', origin: '湖南长沙', qc: '合格' },
      { id: 'M-09', name: '玉米面', category: '原料', spec: '细粉', unit: 'kg', stock: 2100, safety: 800, supplier: 'SP-04', supplierName: '常德粮油副产公司', price: 2.60, batchNo: 'YL-261109', origin: '湖南常德', qc: '合格' },
      { id: 'M-10', name: '豆粕', category: '原料', spec: '蛋白≥43%', unit: 'kg', stock: 1300, safety: 600, supplier: 'SP-04', supplierName: '常德粮油副产公司', price: 3.40, batchNo: 'YL-261110', origin: '湖南常德', qc: '合格' }
    ],
    batches: [
      { id: 'MJ-261115-01', strain: 'EG-01', variety: '平菇', room: 'GF-01', stage: '出菇', flush: 2, bags: 4200, start: at(-26, '08:00') },
      { id: 'MJ-261115-02', strain: 'EG-02', variety: '杏鲍菇', room: 'GF-02', stage: '出菇', flush: 2, bags: 3800, start: at(-26, '08:00') },
      { id: 'MJ-261115-03', strain: 'EG-03', variety: '金针菇', room: '—', stage: '灭菌', flush: 0, bags: 4000, start: at(-2, '06:00') },
      { id: 'MJ-261115-04', strain: 'EG-04', variety: '香菇', room: 'PY-01', stage: '培养', flush: 0, bags: 3600, start: at(-18, '08:00') },
      { id: 'MJ-261115-05', strain: 'EG-01', variety: '平菇', room: 'GF-05', stage: '出菇', flush: 2, bags: 4200, start: at(-25, '08:00') },
      { id: 'MJ-261115-06', strain: 'EG-02', variety: '杏鲍菇', room: 'GF-06', stage: '出菇', flush: 2, bags: 3800, start: at(-25, '08:00') },
      { id: 'MJ-261112-07', strain: 'EG-03', variety: '金针菇', room: 'GF-03', stage: '出菇', flush: 1, bags: 4000, start: at(-30, '08:00') },
      { id: 'MJ-261110-08', strain: 'EG-04', variety: '香菇', room: 'LK-A', stage: '冷链', flush: 2, bags: 3600, start: at(-36, '08:00') },
      { id: 'MJ-261116-01', strain: 'EG-01', variety: '平菇', room: 'BD-01', stage: '菌包', flush: 0, bags: 4000, start: at(0, '06:30') },
      { id: 'MJ-261116-02', strain: 'EG-02', variety: '杏鲍菇', room: 'JZ-01', stage: '接种', flush: 0, bags: 3600, start: at(-1, '07:00') },
      { id: 'MJ-261116-03', strain: 'EG-03', variety: '金针菇', room: 'PY-01', stage: '培养', flush: 0, bags: 4000, start: at(-6, '08:00') },
      { id: 'MJ-261116-04', strain: 'EG-04', variety: '香菇', room: 'MJ-W', stage: '灭菌', flush: 0, bags: 3600, start: at(-1, '06:00') }
    ],
    recipes: [
      { id: 'PB-261116-01', strain: 'EG-01', template: 'TPL-01', formula: '木屑78% 麦麸20% 石灰1% 石膏1%', moisture: 62, ph: 7.5, bags: 4000, bagWeight: 1.15, bagRange: 'BD261116-0001~4000', status: '装袋', operator: '黄忠坚', time: at(0, '06:30') },
      { id: 'PB-261116-02', strain: 'EG-02', template: 'TPL-02', formula: '木屑73% 麦麸25% 石灰1% 石膏1%', moisture: 63, ph: 7.2, bags: 3600, bagWeight: 1.2, bagRange: 'BD261116-4001~7600', status: '待灭菌', operator: '黄忠坚', time: at(0, '05:40') },
      { id: 'PB-261115-03', strain: 'EG-03', template: 'TPL-03', formula: '玉米芯40% 木屑38% 麦麸20% 石灰2%', moisture: 64, ph: 7.8, bags: 4000, bagWeight: 1.1, bagRange: 'BD261115-0001~4000', status: '已灭菌', operator: '陈小忠', time: at(-1, '06:10') }
    ],
    sterilize: [
      { id: 'ST-261116-01', pot: 'MJ-01', batch: 'MJ-261116-04', bags: 1800, loadWay: '整筐装载', hold: 120, peak: 121.4, minTemp: 120.6, judgeStd: 'SOP-02', operator: '张才孙', review: '通过', status: '已完成', time: at(0, '04:20'), curve: curve(120, false), completeness: curveComplete(curve(120, false)), anomalies: [], notes: [] },
      { id: 'ST-261116-02', pot: 'MJ-02', batch: 'MJ-261116-04', bags: 1800, loadWay: '整筐装载', hold: 120, peak: 121.2, minTemp: 120.4, judgeStd: 'SOP-02', operator: '张才孙', review: '通过', status: '已完成', time: at(0, '04:20'), curve: curve(120, false), completeness: curveComplete(curve(120, false)), anomalies: [], notes: [] },
      { id: 'ST-261116-03', pot: 'MJ-03', batch: 'MJ-261115-03', bags: 2000, loadWay: '整筐装载', hold: 108, peak: 121.1, minTemp: null, judgeStd: 'SOP-02', operator: '朱泉龙', review: '待复判', status: '曲线缺口', time: at(0, '02:10'), curve: curve(108, true), completeness: curveComplete(curve(108, true)), anomalies: [{ type: '中途断电', time: at(0, '02:40'), duration: '12min', measure: '恢复供电后补保温', impact: '保温段丢点 2 个，曲线不完整' }], notes: [] },
      { id: 'ST-261115-04', pot: 'MJ-04', batch: 'MJ-261115-03', bags: 2000, loadWay: '整筐装载', hold: 120, peak: 121.6, minTemp: 120.8, judgeStd: 'SOP-02', operator: '朱泉龙', review: '通过', status: '已完成', time: at(-1, '02:10'), curve: curve(120, false), completeness: curveComplete(curve(120, false)), anomalies: [], notes: [] }
    ],
    inoculation: [
      { id: 'IN-261116-01', batch: 'MJ-261116-02', strain: 'EG-02', room: 'JZ-01', bags: 1800, amount: '15g/袋', operator: '周明轩', reviewer: '廖春亮', pollution: 0.4, predicted: 0.5, sampleCount: 6, deviation: -0.1, grade: 'A', tools: 'JZ-GJ-01', startTime: at(0, '08:00'), endTime: at(0, '08:30'), time: at(0, '08:30') },
      { id: 'IN-261116-02', batch: 'MJ-261116-02', strain: 'EG-02', room: 'JZ-01', bags: 1800, amount: '15g/袋', operator: '周明轩', reviewer: '廖春亮', pollution: 0.6, predicted: 0.5, sampleCount: 6, deviation: 0.1, grade: 'A', tools: 'JZ-GJ-02', startTime: at(0, '09:40'), endTime: at(0, '10:10'), time: at(0, '10:10') },
      { id: 'IN-261115-03', batch: 'MJ-261116-03', strain: 'EG-03', room: 'JZ-01', bags: 4000, amount: '12g/袋', operator: '廖春亮', reviewer: '周明轩', pollution: 0.8, predicted: 0.6, sampleCount: 8, deviation: 0.2, grade: 'A', tools: 'JZ-GJ-03', startTime: at(-5, '08:00'), endTime: at(-5, '09:00'), time: at(-5, '09:00') }
    ],
    cleanliness: [
      { id: 'CL-261116-01', room: 'JZ-01', settle: 0.8, particle: 320, limit: 3.5, pass: true, grade: 'A', uv: 40, alcohol: '75% · 2.5L', disinfectNo: 'XD-261116-01', time: at(0, '07:40') },
      { id: 'CL-261116-02', room: 'JZ-01', settle: 1.2, particle: 410, limit: 3.5, pass: true, grade: 'A', uv: 45, alcohol: '75% · 2.0L', disinfectNo: 'XD-261116-02', time: at(0, '12:40') },
      { id: 'CL-261115-03', room: 'JZ-01', settle: 3.8, particle: 980, limit: 3.5, pass: false, grade: 'A', uv: 30, alcohol: '75% · 1.5L', disinfectNo: 'XD-261115-03', time: at(-1, '07:40') },
      { id: 'CL-261115-04', room: 'JZ-01', settle: 1.0, particle: 350, limit: 3.5, pass: true, grade: 'A', uv: 42, alcohol: '75% · 2.2L', disinfectNo: 'XD-261115-04', time: at(-1, '12:40') }
    ],
    culture: [
      { id: 'CU-261115-04', batch: 'MJ-261115-04', shelf: 'PY-01-A03', days: 18, fullRate: 88.2, temp: 23.6, hum: 65, co2: 1180, negPressure: -12, cullRate: 2.8, turnCount: 3, turnLast: at(-2, '10:00'), waterCount: 2, waterAmount: 18, accumTemp: 425, advanceBasis: '积温425°C·d / 18天', contamination: { type: '绿霉', count: 101, position: 'A03 中层', handle: '剔除隔离', handler: '徐水应', date: at(-2, '10:00') } },
      { id: 'CU-261116-03', batch: 'MJ-261116-03', shelf: 'PY-01-B01', days: 6, fullRate: 31.5, temp: 23.2, hum: 64, co2: 1220, negPressure: -10, cullRate: 0.5, turnCount: 1, turnLast: at(-1, '10:00'), waterCount: 1, waterAmount: 8, accumTemp: 140, advanceBasis: '积温140°C·d / 6天', contamination: { type: '—', count: 20, position: 'B01 抽检', handle: '剔除', handler: '徐水应', date: at(-1, '10:00') } },
      { id: 'CU-261115-01', batch: 'MJ-261115-01', shelf: 'PY-01-A01', days: 24, fullRate: 92.6, temp: 23.8, hum: 66, co2: 1150, negPressure: -11, cullRate: 0.9, turnCount: 4, turnLast: at(-6, '10:00'), waterCount: 3, waterAmount: 26, accumTemp: 571, advanceBasis: '积温571°C·d / 24天', contamination: { type: '青霉', count: 38, position: 'A01 上层', handle: '剔除隔离', handler: '徐水应', date: at(-6, '10:00') } },
      { id: 'CU-261115-02', batch: 'MJ-261115-02', shelf: 'PY-01-A02', days: 24, fullRate: 94.1, temp: 23.5, hum: 65, co2: 1160, negPressure: -12, cullRate: 0.7, turnCount: 4, turnLast: at(-6, '10:00'), waterCount: 3, waterAmount: 24, accumTemp: 564, advanceBasis: '积温564°C·d / 24天', contamination: { type: '—', count: 27, position: 'A02 抽检', handle: '剔除', handler: '徐水应', date: at(-6, '10:00') } }
    ],
    fruiting: [
      { id: 'FR-261115-01', batch: 'MJ-261115-01', room: 'GF-01', flush: 2, tempDiff: 8, hum: 90, co2: 620, light: 260, wind: 0.3, airChanges: 6, progress: '菇蕾分化', expect: at(5, '06:00'), budDensity: 42, capDiameter: 28, deformCount: 6, deformTypes: { cap: 2, spot: 1, brown: 2, open: 1 }, deformRate: 1.4, sprayCount: 3, sprayWater: 12, suppLight: 4, preCheck: '合格' },
      { id: 'FR-261115-02', batch: 'MJ-261115-02', room: 'GF-02', flush: 2, tempDiff: 6, hum: 91, co2: 986, light: 300, wind: 0.4, airChanges: 8, progress: '子实体生长', expect: at(3, '06:00'), budDensity: 38, capDiameter: 45, deformCount: 14, deformTypes: { cap: 4, spot: 3, brown: 5, open: 2 }, deformRate: 3.7, sprayCount: 4, sprayWater: 16, suppLight: 5, preCheck: '合格' },
      { id: 'FR-261112-07', batch: 'MJ-261112-07', room: 'GF-03', flush: 1, tempDiff: 4, hum: 92, co2: 540, light: 180, wind: 0.2, airChanges: 5, progress: '子实体生长', expect: at(4, '06:00'), budDensity: 55, capDiameter: 18, deformCount: 4, deformTypes: { cap: 1, spot: 1, brown: 1, open: 1 }, deformRate: 0.7, sprayCount: 2, sprayWater: 9, suppLight: 3, preCheck: '合格' },
      { id: 'FR-261115-04', batch: 'MJ-261115-04', room: 'GF-04', flush: 2, tempDiff: 9, hum: 87, co2: 700, light: 220, wind: 0.3, airChanges: 6, progress: '催蕾', expect: at(8, '06:00'), budDensity: 20, capDiameter: 12, deformCount: 3, deformTypes: { cap: 1, spot: 0, brown: 2, open: 0 }, deformRate: 1.5, sprayCount: 3, sprayWater: 11, suppLight: 4, preCheck: '待抽检' },
      { id: 'FR-261115-05', batch: 'MJ-261115-05', room: 'GF-05', flush: 2, tempDiff: 8, hum: 89, co2: 640, light: 260, wind: 0.3, airChanges: 6, progress: '菇蕾分化', expect: at(5, '06:00'), budDensity: 40, capDiameter: 26, deformCount: 5, deformTypes: { cap: 2, spot: 1, brown: 1, open: 1 }, deformRate: 1.3, sprayCount: 3, sprayWater: 12, suppLight: 4, preCheck: '合格' },
      { id: 'FR-261115-06', batch: 'MJ-261115-06', room: 'GF-06', flush: 2, tempDiff: 6, hum: 91, co2: 580, light: 300, wind: 0.4, airChanges: 7, progress: '子实体生长', expect: at(3, '06:00'), budDensity: 36, capDiameter: 44, deformCount: 7, deformTypes: { cap: 2, spot: 2, brown: 2, open: 1 }, deformRate: 1.9, sprayCount: 4, sprayWater: 15, suppLight: 5, preCheck: '合格' }
    ],
    harvest: [
      { id: 'HV-261116-01', batch: 'MJ-261115-01', room: 'GF-01', flush: 2, kg: 320, grade1: 264, grade2: 48, scrap: 8, workers: 4, hours: 3.5, operator: '惠加宁', method: '人工', gradeStd: 'SOP-06', time: at(0, '06:20'), weighTicket: { no: 'BD-261116-01', device: '工业称重-01', gross: 328, net: 320, tare: 8, reviewer: '陈小忠' }, nonconform: { type: '畸形', qty: 8, disposal: '销毁', handler: '惠加宁', time: at(0, '07:00'), cert: 'XF-261116-01' }, yieldRate: 0.076, cost: 1860, margin: 38.5 },
      { id: 'HV-261116-02', batch: 'MJ-261115-02', room: 'GF-02', flush: 2, kg: 286, grade1: 236, grade2: 42, scrap: 8, workers: 4, hours: 3.2, operator: '惠加宁', method: '人工', gradeStd: 'SOP-06', time: at(0, '06:40'), weighTicket: { no: 'BD-261116-02', device: '工业称重-01', gross: 294, net: 286, tare: 8, reviewer: '陈小忠' }, nonconform: { type: '规格不足', qty: 8, disposal: '降级', handler: '惠加宁', time: at(0, '07:10'), cert: '—' }, yieldRate: 0.075, cost: 1720, margin: 36.2 },
      { id: 'HV-261116-03', batch: 'MJ-261112-07', room: 'GF-03', flush: 1, kg: 240, grade1: 198, grade2: 36, scrap: 6, workers: 3, hours: 3.0, operator: '徐水应', method: '人工', gradeStd: 'SOP-06', time: at(0, '07:00'), weighTicket: { no: 'BD-261116-03', device: '工业称重-02', gross: 247, net: 240, tare: 7, reviewer: '陈小忠' }, nonconform: { type: '开伞', qty: 6, disposal: '销毁', handler: '徐水应', time: at(0, '07:30'), cert: 'XF-261116-02' }, yieldRate: 0.060, cost: 1480, margin: 33.8 },
      { id: 'HV-261116-04', batch: 'MJ-261115-05', room: 'GF-05', flush: 2, kg: 220, grade1: 181, grade2: 33, scrap: 6, workers: 3, hours: 2.8, operator: '徐水应', method: '人工', gradeStd: 'SOP-06', time: at(0, '07:20'), weighTicket: { no: 'BD-261116-04', device: '工业称重-02', gross: 227, net: 220, tare: 7, reviewer: '陈小忠' }, nonconform: { type: '破损', qty: 6, disposal: '降级', handler: '徐水应', time: at(0, '07:50'), cert: '—' }, yieldRate: 0.052, cost: 1360, margin: 31.5 },
      { id: 'HV-261116-05', batch: 'MJ-261115-06', room: 'GF-06', flush: 2, kg: 220, grade1: 181, grade2: 33, scrap: 6, workers: 3, hours: 2.8, operator: '惠加宁', method: '人工', gradeStd: 'SOP-06', time: at(0, '07:40'), weighTicket: { no: 'BD-261116-05', device: '工业称重-01', gross: 227, net: 220, tare: 7, reviewer: '陈小忠' }, nonconform: { type: '色泽不良', qty: 6, disposal: '降级', handler: '惠加宁', time: at(0, '08:00'), cert: '—' }, yieldRate: 0.058, cost: 1340, margin: 32.0 },
      { id: 'HV-261115-06', batch: 'MJ-261110-08', room: 'GF-04', flush: 2, kg: 410, grade1: 336, grade2: 62, scrap: 12, workers: 5, hours: 4.0, operator: '惠加宁', method: '自动采摘辅助设备', gradeStd: 'SOP-06', time: at(-1, '06:30'), weighTicket: { no: 'BD-261115-06', device: '工业称重-01', gross: 421, net: 410, tare: 11, reviewer: '陈小忠' }, nonconform: { type: '霉变', qty: 12, disposal: '销毁', handler: '惠加宁', time: at(-1, '07:20'), cert: 'XF-261115-03' }, yieldRate: 0.114, cost: 2380, margin: 41.2 }
    ],
    storage: [
      { id: 'SL-261116-01', zone: 'YL-01', batch: 'MJ-261115-01', variety: '平菇', tons: 1.4, expiry: at(2, '23:59'), temp: 5.6, status: '临期', shelf: 'YL-01-P01', capacity: 2.0, codeRange: 'SNJG-20261115-01001~01120', reviewer: '陈小忠' },
      { id: 'SL-261116-02', zone: 'YL-01', batch: 'MJ-261115-02', variety: '杏鲍菇', tons: 1.8, expiry: at(3, '23:59'), temp: 5.6, status: '临期', shelf: 'YL-01-P02', capacity: 2.0, codeRange: 'SNJG-20261115-02001~02100', reviewer: '陈小忠' },
      { id: 'SL-261115-03', zone: 'LK-A', batch: 'MJ-261110-08', variety: '香菇', tons: 6.8, expiry: at(9, '23:59'), temp: 2.8, status: '正常', shelf: 'LK-A-R03', capacity: 12.0, codeRange: 'SNJG-20261110-08001~08600', reviewer: '廖春亮' },
      { id: 'SL-261115-04', zone: 'LK-B', batch: 'MJ-261112-07', variety: '金针菇', tons: 4.1, expiry: at(7, '23:59'), temp: 3.1, status: '正常', shelf: 'LK-B-R01', capacity: 10.0, codeRange: 'SNJG-20261112-07001~07400', reviewer: '廖春亮' }
    ],
    storageMoves: [
      { id: 'SM-261116-01', type: '入库', zone: 'YL-01', batch: 'MJ-261115-01', tons: 1.4, operator: '陈小忠', reviewer: '廖春亮', codeRange: 'SNJG-20261115-01001~01120', time: at(0, '08:10') },
      { id: 'SM-261116-02', type: '入库', zone: 'YL-01', batch: 'MJ-261115-02', tons: 1.8, operator: '陈小忠', reviewer: '廖春亮', codeRange: 'SNJG-20261115-02001~02100', time: at(0, '08:20') },
      { id: 'SM-261116-03', type: '出库', zone: 'LK-A', batch: 'MJ-261110-08', tons: 0.6, operator: '廖春亮', reviewer: '陈小忠', dest: '商超配送', carrier: '湘冷物流', truck: '湘A·C2618', time: at(0, '09:30') },
      { id: 'SM-261115-04', type: '入库', zone: 'LK-A', batch: 'MJ-261110-08', tons: 7.4, operator: '陈小忠', reviewer: '廖春亮', codeRange: 'SNJG-20261110-08001~08600', time: at(-1, '09:00') },
      { id: 'SM-261115-05', type: '入库', zone: 'LK-B', batch: 'MJ-261112-07', tons: 4.1, operator: '陈小忠', reviewer: '廖春亮', codeRange: 'SNJG-20261112-07001~07400', time: at(-1, '10:00') }
    ],
    devices: [
      { id: 'DV-01', name: '1号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '运行', bought: '2023-04-12', control: false, circuit: 'HL-MJ-01', power: 45, energyToday: 186, maintainDate: at(-88, '09:00') },
      { id: 'DV-02', name: '2号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '运行', bought: '2023-04-12', control: false, circuit: 'HL-MJ-02', power: 45, energyToday: 178, maintainDate: at(-60, '09:00') },
      { id: 'DV-03', name: '3号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '故障', bought: '2023-04-12', control: false, circuit: 'HL-MJ-03', power: 45, energyToday: 0, maintainDate: at(-30, '09:00') },
      { id: 'DV-04', name: '4号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '待机', bought: '2024-02-20', control: false, circuit: 'HL-MJ-04', power: 45, energyToday: 12, maintainDate: at(-20, '09:00') },
      { id: 'DV-05', name: '自动装袋机', type: '装袋机', model: 'ZD-17', maker: '漳州菌机装备', location: 'BD-01', status: '运行', bought: '2023-06-08', control: false, circuit: 'HL-BD-01', power: 7.5, energyToday: 42, maintainDate: at(-26, '09:00') },
      { id: 'DV-06', name: '无菌接种机', type: '接种机', model: 'JZ-100', maker: '漳州菌机装备', location: 'JZ-01', status: '运行', bought: '2023-06-08', control: false, circuit: 'HL-JZ-01', power: 3, energyToday: 15, maintainDate: at(-15, '09:00') },
      { id: 'HS-01', name: 'GF-01 超声波雾化加湿器', type: '超声波雾化加湿器', model: 'CS-20', maker: '苏州雾联环境', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 90, circuit: 'HL-GF01-01', power: 1.2, energyToday: 9, maintainDate: at(-40, '09:00') },
      { id: 'HS-02', name: 'GF-03 超声波雾化加湿器', type: '超声波雾化加湿器', model: 'CS-20', maker: '苏州雾联环境', location: 'GF-03', status: '离线', bought: '2023-08-15', control: true, setpoint: 92, circuit: 'HL-GF03-01', power: 1.2, energyToday: 0, maintainDate: at(-40, '09:00') },
      { id: 'HS-03', name: 'GF-05 高压微雾加湿器', type: '高压微雾加湿器', model: 'GW-35', maker: '苏州雾联环境', location: 'GF-05', status: '运行', bought: '2023-08-15', control: true, setpoint: 90, circuit: 'HL-GF05-01', power: 2.2, energyToday: 14, maintainDate: at(-35, '09:00') },
      { id: 'XF-01', name: 'GF-01 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 800, circuit: 'HL-GF01-02', power: 2.2, energyToday: 18, maintainDate: at(-50, '09:00') },
      { id: 'XF-02', name: 'GF-02 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-02', status: '联动', bought: '2023-08-15', control: true, setpoint: 800, circuit: 'HL-GF02-02', power: 2.2, energyToday: 22, maintainDate: at(-50, '09:00') },
      { id: 'XF-04', name: 'GF-04 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-04', status: '运行', bought: '2023-08-15', control: true, setpoint: 800, circuit: 'HL-GF04-02', power: 2.2, energyToday: 17, maintainDate: at(-50, '09:00') },
      { id: 'LS-01', name: '冷水机组', type: '冷水机组', model: 'LS-60', maker: '烟台制冷股份', location: 'LK-A', status: '运行', bought: '2023-05-30', control: true, setpoint: 3, circuit: 'HL-LK-01', power: 30, energyToday: 240, maintainDate: at(-52, '09:00') },
      { id: 'XH-05', name: 'GF-05 层架循环风机', type: '层架循环风机', model: 'XH-120', maker: '德州通风设备', location: 'GF-05', status: '定时', bought: '2024-03-11', control: true, setpoint: 15, circuit: 'HL-GF05-02', power: 0.75, energyToday: 5, maintainDate: at(-30, '09:00') },
      { id: 'ZM-02', name: 'GF-02 LED植物补光灯', type: 'LED植物补光灯', model: 'LED-200', maker: '中山菌光照明', location: 'GF-02', status: '运行', bought: '2023-08-15', control: true, setpoint: 300, circuit: 'HL-GF02-03', power: 0.4, energyToday: 4, maintainDate: at(-70, '09:00') },
      { id: 'SN-C02', name: 'GF-02 CO₂传感器', type: 'CO₂传感器', model: 'CO2-NDIR', maker: '汉威传感', location: 'GF-02', status: '运行', bought: '2024-05-06', control: false, circuit: 'HL-GF02-04', power: 0.02, energyToday: 0.4, maintainDate: at(-100, '09:00') },
      { id: 'SN-T01', name: 'GF-01 温湿度传感器', type: '温湿度传感器', model: 'TH-485', maker: '汉威传感', location: 'GF-01', status: '运行', bought: '2024-05-06', control: false, circuit: 'HL-GF01-04', power: 0.02, energyToday: 0.4, maintainDate: at(-100, '09:00') },
      { id: 'SN-T04', name: '预冷区温湿度传感器', type: '温湿度传感器', model: 'TH-485', maker: '汉威传感', location: 'YL-01', status: '运行', bought: '2024-05-06', control: false, circuit: 'HL-YL-04', power: 0.02, energyToday: 0.4, maintainDate: at(-100, '09:00') },
      { id: 'RB-01', name: '风冷热泵机组', type: '风冷热泵', model: 'RB-130', maker: '烟台制冷股份', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 18, circuit: 'HL-GF01-05', power: 18, energyToday: 156, maintainDate: at(-45, '09:00') },
      { id: 'DR-01', name: 'GF-01 电加热', type: '电加热', model: 'DR-12', maker: '衡阳电热设备', location: 'GF-01', status: '待机', bought: '2023-08-15', control: true, setpoint: 20, circuit: 'HL-GF01-06', power: 12, energyToday: 6, maintainDate: at(-45, '09:00') },
      { id: 'KT-01', name: '水冷空调', type: '水冷空调', model: 'KT-50', maker: '烟台制冷股份', location: 'PY-01', status: '运行', bought: '2023-07-01', control: true, setpoint: 23, circuit: 'HL-PY-01', power: 15, energyToday: 132, maintainDate: at(-55, '09:00') },
      { id: 'FN-01', name: 'GF-02 循环内机', type: '循环内机', model: 'FN-90', maker: '德州通风设备', location: 'GF-02', status: '运行', bought: '2023-08-15', control: true, setpoint: 60, circuit: 'HL-GF02-05', power: 1.1, energyToday: 9, maintainDate: at(-50, '09:00') },
      { id: 'FP-01', name: 'GF-03 负压排风扇', type: '负压排风扇', model: 'FP-140', maker: '德州通风设备', location: 'GF-03', status: '运行', bought: '2023-08-15', control: true, setpoint: -15, circuit: 'HL-GF03-02', power: 1.5, energyToday: 12, maintainDate: at(-50, '09:00') },
      { id: 'FV-01', name: 'GF-01 电动风阀', type: '电动风阀', model: 'FV-200', maker: '德州通风设备', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 70, circuit: 'HL-GF01-07', power: 0.1, energyToday: 1, maintainDate: at(-60, '09:00') },
      { id: 'PY-01', name: 'GF-04 层架喷淋补水装置', type: '层架喷淋补水装置', model: 'PL-60', maker: '漳州菌机装备', location: 'GF-04', status: '定时', bought: '2024-01-10', control: true, setpoint: 12, circuit: 'HL-GF04-03', power: 0.6, energyToday: 3, maintainDate: at(-25, '09:00') },
      { id: 'CY-01', name: '臭氧发生器', type: '臭氧发生器', model: 'CY-20', maker: '苏州雾联环境', location: 'JZ-01', status: '待机', bought: '2023-09-01', control: true, setpoint: 30, circuit: 'HL-JZ-02', power: 0.8, energyToday: 2, maintainDate: at(-30, '09:00') },
      { id: 'ZW-01', name: '紫外消杀装置', type: '紫外消杀装置', model: 'ZW-150', maker: '中山菌光照明', location: 'JZ-01', status: '运行', bought: '2023-09-01', control: true, setpoint: 40, circuit: 'HL-JZ-03', power: 0.15, energyToday: 2, maintainDate: at(-30, '09:00') },
      { id: 'JH-01', name: '净化机组', type: '净化机组', model: 'JH-300', maker: '苏州雾联环境', location: 'JZ-01', status: '运行', bought: '2023-09-01', control: false, circuit: 'HL-JZ-04', power: 4, energyToday: 38, maintainDate: at(-40, '09:00') },
      { id: 'HE-01', name: 'HEPA 高效过滤', type: 'HEPA高效过滤', model: 'H14', maker: '苏州雾联环境', location: 'JZ-01', status: '运行', bought: '2023-09-01', control: false, circuit: 'HL-JZ-05', power: 0, energyToday: 0, maintainDate: at(-40, '09:00') },
      { id: 'QX-01', name: '菌筐清洗机', type: '菌筐清洗机', model: 'QX-80', maker: '漳州菌机装备', location: 'BD-01', status: '待机', bought: '2024-02-01', control: false, circuit: 'HL-BD-02', power: 5.5, energyToday: 8, maintainDate: at(-20, '09:00') },
      { id: 'SS-01', name: '周转筐输送线', type: '周转筐输送线', model: 'SS-120', maker: '漳州菌机装备', location: 'BD-01', status: '运行', bought: '2024-02-01', control: false, circuit: 'HL-BD-03', power: 3, energyToday: 20, maintainDate: at(-20, '09:00') },
      { id: 'CZ-01', name: '自动采摘辅助设备', type: '自动采摘辅助设备', model: 'CZ-60', maker: '漳州菌机装备', location: 'GF-04', status: '待机', bought: '2024-04-01', control: true, setpoint: 50, circuit: 'HL-GF04-04', power: 2.5, energyToday: 5, maintainDate: at(-15, '09:00') },
      { id: 'GY-01', name: '工业加湿机组', type: '工业加湿机组', model: 'GY-200', maker: '苏州雾联环境', location: 'PY-01', status: '运行', bought: '2023-07-01', control: true, setpoint: 65, circuit: 'HL-PY-02', power: 3, energyToday: 26, maintainDate: at(-55, '09:00') },
      { id: 'CS-01', name: '除湿机', type: '除湿机', model: 'CS-90', maker: '烟台制冷股份', location: 'LK-B', status: '运行', bought: '2023-05-30', control: true, setpoint: 85, circuit: 'HL-LK-02', power: 2.8, energyToday: 24, maintainDate: at(-52, '09:00') },
      { id: 'SN-L01', name: 'GF-01 光照传感器', type: '光照传感器', model: 'LX-200', maker: '汉威传感', location: 'GF-01', status: '运行', bought: '2024-05-06', control: false, circuit: 'HL-GF01-08', power: 0.02, energyToday: 0.4, maintainDate: at(-100, '09:00') },
      { id: 'SN-P01', name: 'GF-01 压差传感器', type: '压差传感器', model: 'DP-100', maker: '汉威传感', location: 'GF-01', status: '运行', bought: '2024-05-06', control: false, circuit: 'HL-GF01-09', power: 0.02, energyToday: 0.4, maintainDate: at(-100, '09:00') },
      { id: 'CM-01', name: '防爆摄像机', type: '防爆摄像机', model: 'EX-IPC', maker: '海康威视', location: 'MJ-W', status: '运行', bought: '2023-10-01', control: false, circuit: 'HL-MJ-05', power: 0.08, energyToday: 1.5, maintainDate: at(-80, '09:00') },
      { id: 'NVR-01', name: '网络录像机', type: '网络录像机', model: 'NVR-32', maker: '海康威视', location: 'MJ-W', status: '运行', bought: '2023-10-01', control: false, circuit: 'HL-MJ-06', power: 0.12, energyToday: 2.5, maintainDate: at(-80, '09:00') },
      { id: 'EM-01', name: '分项电表', type: '分项电表', model: 'EM-485', maker: '正泰仪表', location: 'BD-01', status: '运行', bought: '2023-06-01', control: false, circuit: 'HL-BD-04', power: 0.01, energyToday: 0.2, maintainDate: at(-120, '09:00') },
      { id: 'WZ-01', name: '工业称重设备', type: '工业称重设备', model: 'WZ-3T', maker: '梅特勒托利多', location: 'GF-01', status: '运行', bought: '2023-08-01', control: false, circuit: 'HL-GF01-10', power: 0.05, energyToday: 0.6, maintainDate: at(-90, '09:00') }
    ],
    commands: [
      { id: 'CMD-261116-01', device: 'XF-02', action: '联动启动', value: 'CO₂ 986ppm > 800ppm', result: '成功', operator: '系统联动', time: at(0, '09:42') },
      { id: 'CMD-261116-02', device: 'HS-01', action: '设定湿度', value: '90%', result: '成功', operator: '张才孙', time: at(0, '08:05') },
      { id: 'CMD-261116-03', device: 'XH-05', action: '定时运行', value: '15min', result: '成功', operator: '系统联动', time: at(0, '05:30') },
      { id: 'CMD-261115-04', device: 'LS-01', action: '设定温度', value: '3°C', result: '成功', operator: '张才孙', time: at(-1, '14:20') }
    ],
    maintainPlans: [
      { id: 'PL-01', device: 'DV-01', item: '季度保养（密封圈/安全阀）', cycle: 90, last: at(-88, '09:00'), next: at(2, '09:00') },
      { id: 'PL-02', device: 'DV-05', item: '月度润滑与皮带张力', cycle: 30, last: at(-26, '09:00'), next: at(4, '09:00') },
      { id: 'PL-03', device: 'HS-01', item: '雾化片除垢', cycle: 45, last: at(-40, '09:00'), next: at(5, '09:00') },
      { id: 'PL-04', device: 'LS-01', item: '冷凝器清洗', cycle: 60, last: at(-52, '09:00'), next: at(8, '09:00') }
    ],
    maintainOrders: [
      { id: 'WO-261116-01', device: 'DV-03', type: '维修', item: '灭菌锅密封圈更换并复判曲线', status: '待处理', owner: '张才孙', parts: 'SP-02', time: at(0, '08:20'), responseMin: null, closedAt: null },
      { id: 'WO-261116-02', device: 'HS-02', type: '维修', item: '加湿器离线检修（电源/雾化片）', status: '处理中', owner: '张才孙', parts: '—', time: at(-1, '22:20'), responseMin: 6, closedAt: null },
      { id: 'WO-261115-03', device: 'DV-01', type: '保养', item: '季度保养完成，安全阀校验合格', status: '已完成', owner: '张才孙', parts: 'SP-02', time: at(-3, '15:00'), responseMin: 12, closedAt: at(-3, '16:30') },
      { id: 'WO-261115-04', device: 'XH-05', type: '保养', item: '循环风机轴承加注润滑脂', status: '已完成', owner: '朱泉龙', parts: '—', time: at(-4, '10:00'), responseMin: 8, closedAt: at(-4, '11:00') },
      { id: 'WO-261114-05', device: 'SN-C02', type: '校准', item: 'CO₂传感器零点/量程校准', status: '已完成', owner: '朱泉龙', parts: '—', time: at(-5, '09:00'), responseMin: 10, closedAt: at(-5, '10:20') },
      { id: 'WO-261113-06', device: 'LS-01', type: '巡检', item: '冷水机组冷凝压力与冷媒量巡检', status: '已完成', owner: '张才孙', parts: '—', time: at(-6, '08:00'), responseMin: 5, closedAt: at(-6, '08:40') },
      { id: 'WO-261112-07', device: 'JH-01', type: '更换', item: '净化机组 HEPA 滤芯更换（压差超限）', status: '已完成', owner: '朱泉龙', parts: 'SP-01', time: at(-7, '14:00'), responseMin: 15, closedAt: at(-7, '16:00') },
      { id: 'WO-261111-08', device: 'FV-01', type: '调试', item: '电动风阀开度反馈调试', status: '已完成', owner: '张才孙', parts: '—', time: at(-8, '10:00'), responseMin: 9, closedAt: at(-8, '11:10') }
    ],
    spares: [
      { id: 'SP-01', name: 'HEPA 过滤器', category: '过滤耗材', spec: 'H14 610×610', unit: '只', stock: 6, safety: 4, location: '备件库 A-01', circuit: 'HL-JZ-05', replaceDue: at(12, '00:00') },
      { id: 'SP-02', name: '灭菌锅密封圈', category: '密封件', spec: 'LSQ-1200 硅胶', unit: '条', stock: 12, safety: 10, location: '备件库 A-02', circuit: 'HL-MJ-01', replaceDue: at(60, '00:00') },
      { id: 'SP-03', name: '电磁阀', category: '阀件', spec: 'DN25 蒸汽', unit: '只', stock: 3, safety: 4, location: '备件库 B-01', circuit: 'HL-MJ-02', replaceDue: at(120, '00:00') },
      { id: 'SP-04', name: 'CO₂传感器', category: '传感器', spec: 'CO2-NDIR', unit: '只', stock: 5, safety: 3, location: '备件库 B-02', circuit: 'HL-GF02-04', replaceDue: at(300, '00:00') },
      { id: 'SP-05', name: '装袋机皮带', category: '传动件', spec: 'ZD-17 同步带', unit: '条', stock: 8, safety: 6, location: '备件库 A-03', circuit: 'HL-BD-01', replaceDue: at(45, '00:00') },
      { id: 'SP-06', name: '雾化片', category: '加湿耗材', spec: 'CS-20 陶瓷', unit: '片', stock: 10, safety: 8, location: '备件库 B-03', circuit: 'HL-GF01-01', replaceDue: at(20, '00:00') },
      { id: 'SP-07', name: '紫外灯管', category: '消杀耗材', spec: 'ZW-150 石英', unit: '支', stock: 4, safety: 4, location: '备件库 B-04', circuit: 'HL-JZ-03', replaceDue: at(8, '00:00') },
      { id: 'SP-08', name: '风机轴承', category: '传动件', spec: '6205-2RS', unit: '只', stock: 9, safety: 6, location: '备件库 A-04', circuit: 'HL-GF05-02', replaceDue: at(90, '00:00') }
    ],
    spareMoves: [
      { id: 'PM-261116-01', type: '出库', spare: 'SP-02', qty: 1, ref: 'WO-261116-01', operator: '张才孙', time: at(0, '08:30') },
      { id: 'PM-261115-02', type: '出库', spare: 'SP-02', qty: 2, ref: 'WO-261115-03', operator: '张才孙', time: at(-3, '15:10') },
      { id: 'PM-261115-03', type: '入库', spare: 'SP-01', qty: 4, ref: 'PO-261110-02', operator: '陈小忠', time: at(-5, '11:00') }
    ],
    teams: [
      { id: 'T-01', name: '拌料班组', shift: '早班 06:00-14:00', leader: '黄忠坚', members: '黄忠坚、陈小忠、廖春亮', certs: '压力容器操作证', certExpire: at(20, '00:00') },
      { id: 'T-02', name: '灭菌班组', shift: '早班 02:00-10:00', leader: '朱泉龙', members: '朱泉龙、张才孙', certs: '灭菌锅操作证', certExpire: at(160, '00:00') },
      { id: 'T-03', name: '接种班组', shift: '中班 08:00-16:00', leader: '周明轩', members: '周明轩、廖春亮', certs: '无菌操作培训证', certExpire: at(300, '00:00') },
      { id: 'T-04', name: '培养班组', shift: '早班 06:00-14:00', leader: '徐水应', members: '徐水应、陈小忠', certs: '—', certExpire: '—' },
      { id: 'T-05', name: '出菇管理班组', shift: '早班 05:00-13:00', leader: '惠加宁', members: '惠加宁、徐水应、廖春亮', certs: '—', certExpire: '—' },
      { id: 'T-06', name: '采收分拣班组', shift: '早班 05:30-13:30', leader: '惠加宁', members: '惠加宁、陈小忠、朱泉龙、廖春亮', certs: '健康证', certExpire: at(-3, '00:00') },
      { id: 'T-07', name: '冷链班组', shift: '中班 08:00-16:00', leader: '陈小忠', members: '陈小忠、廖春亮', certs: '叉车证', certExpire: at(220, '00:00') },
      { id: 'T-08', name: '设备运维班组', shift: '常白班 + 值班', leader: '张才孙', members: '张才孙、朱泉龙', certs: '电工证', certExpire: at(400, '00:00') }
    ],
    sops: [
      { id: 'SOP-01', name: '菌包配方与拌料标准', version: 'v3.2', scope: '全品种', effective: at(-60, '00:00'), status: '启用', key: '含水率 60-65%，pH 7.2-7.8，拌料均匀度 ≥ 95%' },
      { id: 'SOP-02', name: '高压灭菌工艺规程', version: 'v2.1', scope: '全品种', effective: at(-90, '00:00'), status: '启用', key: '121°C 保温 120min，排气冷却 ≤ 60°C 出锅' },
      { id: 'SOP-03', name: '无菌接种操作规程', version: 'v1.8', scope: '全品种', effective: at(-45, '00:00'), status: '启用', key: '洁净度 100 级，接种量 12-15g/袋，沉降菌 ≤ 3.5cfu' },
      { id: 'SOP-04', name: '菌丝培养管理标准', version: 'v2.0', scope: '全品种', effective: at(-70, '00:00'), status: '启用', key: '22-25°C 避光培养，每 5 天翻堆，污染率 ≤ 3.0%' },
      { id: 'SOP-05', name: '出菇环境调控标准', version: 'v4.1', scope: '分品种', effective: at(-20, '00:00'), status: '启用', key: '平菇 15-20°C / 杏鲍菇 14-18°C / 金针菇 10-14°C / 香菇 12-18°C；CO₂ < 800ppm' },
      { id: 'SOP-06', name: '采收与分级标准', version: 'v1.5', scope: '分品种', effective: at(-35, '00:00'), status: '启用', key: '八成熟采收，一级菇占比 ≥ 80%，采后 2h 内入预冷' }
    ],
    enterprise: [
      { id: 'EN-01', field: '企业名称', value: '托克逊县数字农业科技有限公司' },
      { id: 'EN-02', field: '统一社会信用代码', value: '91430100MA4L2X8K3B' },
      { id: 'EN-03', field: '法定代表人', value: '李建国' },
      { id: 'EN-04', field: '注册资本', value: '2,000 万元' },
      { id: 'EN-05', field: '成立日期', value: '2018-05-16' },
      { id: 'EN-06', field: '厂区地址', value: '湖南省长沙市望城区铜官循环工业基地' },
      { id: 'EN-07', field: '年菌包产能', value: '1,200 万袋' },
      { id: 'EN-08', field: '年产鲜菇', value: '8,600 吨' },
      { id: 'EN-09', field: '联系电话', value: '0731-8888 6666' },
      { id: 'EN-10', field: '员工总数', value: '86 人' }
    ],
    certs: [
      { id: 'CT-01', name: '食品生产许可证（SC）', no: 'SC11643012200886', expire: at(400, '00:00'), status: '有效' },
      { id: 'CT-02', name: 'ISO22000 食品安全体系', no: 'CN23/FSM-0412', expire: at(25, '00:00'), status: '即将到期' },
      { id: 'CT-03', name: '绿色食品认证', no: 'LB-43-2601180088A', expire: at(180, '00:00'), status: '有效' },
      { id: 'CT-04', name: 'GAP 良好农业规范', no: 'GAP-CN-2023-117', expire: at(-10, '00:00'), status: '已过期' }
    ],
    rules: [
      { id: 'AR-01', metric: 'CO₂ 浓度', scope: '全部出菇房', op: '>', threshold: 800, unit: 'ppm', level: 'urgent', channel: '站内+短信+电话', duration: 5, linkage: 'LK-01', enabled: true },
      { id: 'AR-02', metric: '温度区间', scope: '分品种配方', op: '超出', threshold: '±2', unit: '°C', level: 'important', channel: '站内+短信', duration: 3, linkage: 'LK-02', enabled: true },
      { id: 'AR-03', metric: '相对湿度', scope: '全部出菇房', op: '<', threshold: 85, unit: '%', level: 'reminder', channel: '站内', duration: 10, linkage: 'LK-03', enabled: true },
      { id: 'AR-04', metric: '污染率', scope: '培养车间', op: '≥', threshold: 3.0, unit: '%', level: 'important', channel: '站内+短信', duration: 0, linkage: 'LK-04', enabled: true },
      { id: 'AR-05', metric: '设备离线时长', scope: '全部设备', op: '≥', threshold: 30, unit: 'min', level: 'important', channel: '站内', duration: 0, linkage: '—', enabled: true },
      { id: 'AR-06', metric: '层间温差', scope: '层架菇房', op: '>', threshold: 1.5, unit: '°C', level: 'reminder', channel: '站内', duration: 15, linkage: 'LK-05', enabled: false },
      { id: 'AR-07', metric: '预冷区温度', scope: 'YL-01', op: '>', threshold: 4, unit: '°C', level: 'important', channel: '站内+短信', duration: 3, linkage: 'LK-06', enabled: true },
      { id: 'AR-08', metric: '洁净度等级', scope: '接种车间', op: '低于', threshold: 'B', unit: '级', level: 'urgent', channel: '站内+短信+电话', duration: 0, linkage: 'LK-07', enabled: true }
    ],
    traceCodes: [
      { id: 'TR-261115-01001', code: 'SNJG-20261115-01001', shortCode: 'K7M2P9', plainCode: '4008-616-001', batch: 'MJ-261115-01', level: '盒码', status: '已绑定', qc: '合格', voidApproval: null, reissueOf: null, printed: true, time: at(0, '08:12') },
      { id: 'TR-261115-01002', code: 'SNJG-20261115-01002', shortCode: 'Q3X8T1', plainCode: '4008-616-002', batch: 'MJ-261115-01', level: '盒码', status: '已绑定', qc: '合格', voidApproval: null, reissueOf: null, printed: true, time: at(0, '08:12') },
      { id: 'TR-261115-02001', code: 'SNJG-20261115-02001', shortCode: 'H9D4W6', plainCode: '4008-616-003', batch: 'MJ-261115-02', level: '盒码', status: '已激活', qc: '合格', voidApproval: null, reissueOf: null, printed: true, time: at(0, '08:25') },
      { id: 'TR-261112-07001', code: 'SNJG-20261112-07001', shortCode: 'B2N5R8', plainCode: '4008-616-004', batch: 'MJ-261112-07', level: '批码', status: '已绑定', qc: '合格', voidApproval: null, reissueOf: null, printed: true, time: at(-2, '09:00') },
      { id: 'TR-261110-08001', code: 'SNJG-20261110-08001', shortCode: 'F6J1L3', plainCode: '4008-616-005', batch: 'MJ-261110-08', level: '批码', status: '已绑定', qc: '合格', voidApproval: null, reissueOf: null, printed: true, time: at(-6, '09:00') },
      { id: 'TR-261116-01001', code: 'SNJG-20261116-01001', shortCode: '—', plainCode: '—', batch: 'MJ-261116-01', level: '批码', status: '已生成', qc: '待校验', voidApproval: null, reissueOf: null, printed: false, time: at(0, '06:40') },
      { id: 'TR-261116-02001', code: 'SNJG-20261116-02001', shortCode: '—', plainCode: '—', batch: 'MJ-261116-02', level: '批码', status: '已生成', qc: '待校验', voidApproval: null, reissueOf: null, printed: false, time: at(0, '07:10') },
      { id: 'TR-261114-09001', code: 'SNJG-20261114-09001', shortCode: 'T8C2V5', plainCode: '4008-616-006', batch: 'MJ-261110-08', level: '盒码', status: '已作废', qc: '合格', voidApproval: 'VA-261115-01（周明轩 批准）', reissueOf: null, printed: true, time: at(-2, '15:00') },
      { id: 'TR-261115-09002', code: 'SNJG-20261115-09002', shortCode: 'M4G7Y2', plainCode: '4008-616-007', batch: 'MJ-261110-08', level: '盒码', status: '已绑定', qc: '合格', voidApproval: null, reissueOf: 'TR-261114-09001', printed: true, time: at(-1, '09:30') }
    ],
    printTasks: [
      { id: 'PT-261116-01', batch: 'MJ-261115-01', count: 120, status: '已完成', operator: '陈小忠', time: at(0, '08:15') },
      { id: 'PT-261116-02', batch: 'MJ-261115-02', count: 100, status: '打印中', operator: '陈小忠', time: at(0, '08:30') }
    ],
    chain: [
      { batch: 'MJ-261115-01', nodes: { material: { time: at(-28, '09:00'), operator: '陈小忠', params: '木屑/麦麸/生石灰 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(-26, '08:00'), operator: '周明轩', params: 'EG-01 栽培种 15g/袋', autoSync: true, revisions: [] }, bag: { time: at(-26, '10:00'), operator: '黄忠坚', params: 'PB 配方 含水率62%', autoSync: true, revisions: [{ time: at(-26, '11:00'), operator: '黄忠坚', note: '含水率由61%修订为62%（实测）' }] }, sterilize: { time: at(-25, '04:00'), operator: '张才孙', params: '121°C 120min 压力0.15MPa', autoSync: true, revisions: [] }, inoculate: { time: at(-24, '09:00'), operator: '周明轩', params: 'JZ-01 沉降菌0.9 A级', autoSync: true, revisions: [] }, culture: { time: at(-24, '14:00'), operator: '徐水应', params: 'PY-01-A01 24天 积温576°C·d', autoSync: true, revisions: [] }, fruit: { time: at(-8, '06:00'), operator: '惠加宁', params: 'GF-01 第2潮', autoSync: true, revisions: [] }, harvest: { time: at(0, '06:20'), operator: '惠加宁', params: '320kg 一级264kg', autoSync: true, revisions: [] }, grade: { time: at(0, '08:00'), operator: '陈小忠', params: '一级/二级/废品', autoSync: true, revisions: [] }, cold: { time: at(0, '08:10'), operator: '陈小忠', params: 'YL-01 1.4t 湘冷物流', autoSync: true, revisions: [] } } },
      { batch: 'MJ-261115-02', nodes: { material: { time: at(-28, '09:00'), operator: '陈小忠', params: '棉籽壳/玉米芯 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(-26, '08:00'), operator: '周明轩', params: 'EG-02 栽培种', autoSync: true, revisions: [] }, bag: { time: at(-26, '10:00'), operator: '黄忠坚', params: '含水率63%', autoSync: true, revisions: [] }, sterilize: { time: at(-25, '04:00'), operator: '张才孙', params: '121°C 120min', autoSync: true, revisions: [] }, inoculate: { time: at(-24, '09:00'), operator: '周明轩', params: 'JZ-01 A级', autoSync: true, revisions: [] }, culture: { time: at(-24, '14:00'), operator: '徐水应', params: 'PY-01-A02 24天', autoSync: true, revisions: [] }, fruit: { time: at(-8, '06:00'), operator: '惠加宁', params: 'GF-02 第2潮', autoSync: true, revisions: [] }, harvest: { time: at(0, '06:40'), operator: '惠加宁', params: '286kg', autoSync: true, revisions: [] }, grade: { time: at(0, '08:00'), operator: '陈小忠', params: '分级完成', autoSync: true, revisions: [] }, cold: { time: at(0, '08:20'), operator: '陈小忠', params: 'YL-01 1.8t', autoSync: true, revisions: [] } } },
      { batch: 'MJ-261115-03', nodes: { material: { time: at(-4, '09:00'), operator: '陈小忠', params: '玉米芯/豆粕 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(-2, '06:00'), operator: '周明轩', params: 'EG-03', autoSync: true, revisions: [] }, bag: { time: at(-2, '08:00'), operator: '陈小忠', params: '玉米芯配方', autoSync: true, revisions: [] }, sterilize: { time: at(0, '02:10'), operator: '朱泉龙', params: '曲线缺口 待复判', autoSync: true, revisions: [{ time: at(0, '08:15'), operator: '朱泉龙', note: '中途断电缺口12min，追加说明待人工复判' }] }, inoculate: null, culture: null, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261115-04', nodes: { material: { time: at(-20, '09:00'), operator: '陈小忠', params: '木屑/麦麸 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(-18, '08:00'), operator: '周明轩', params: 'EG-04', autoSync: true, revisions: [] }, bag: { time: at(-18, '10:00'), operator: '黄忠坚', params: '木屑配方', autoSync: true, revisions: [] }, sterilize: { time: at(-17, '04:00'), operator: '张才孙', params: '121°C 120min', autoSync: true, revisions: [] }, inoculate: { time: at(-16, '09:00'), operator: '廖春亮', params: 'JZ-01 A级', autoSync: true, revisions: [] }, culture: { time: at(-16, '14:00'), operator: '徐水应', params: 'PY-01-A03 18天 污染2.8%', autoSync: true, revisions: [] }, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261116-01', nodes: { material: { time: at(-1, '09:00'), operator: '陈小忠', params: '木屑/麦麸/生石灰 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(0, '06:00'), operator: '周明轩', params: 'EG-01', autoSync: true, revisions: [] }, bag: { time: at(0, '06:30'), operator: '黄忠坚', params: 'PB-261116-01 4000袋', autoSync: true, revisions: [] }, sterilize: null, inoculate: null, culture: null, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261110-08', nodes: { material: { time: at(-38, '09:00'), operator: '陈小忠', params: '木屑/麦麸 进厂检验合格', autoSync: true, revisions: [] }, strain: { time: at(-36, '08:00'), operator: '周明轩', params: 'EG-04', autoSync: true, revisions: [] }, bag: { time: at(-36, '10:00'), operator: '黄忠坚', params: '木屑配方', autoSync: true, revisions: [] }, sterilize: { time: at(-35, '04:00'), operator: '张才孙', params: '121°C 120min', autoSync: true, revisions: [] }, inoculate: { time: at(-34, '09:00'), operator: '周明轩', params: 'JZ-01 A级', autoSync: true, revisions: [] }, culture: { time: at(-34, '14:00'), operator: '徐水应', params: '26天', autoSync: true, revisions: [] }, fruit: { time: at(-14, '06:00'), operator: '惠加宁', params: 'GF-04 第2潮', autoSync: true, revisions: [] }, harvest: { time: at(-1, '06:30'), operator: '惠加宁', params: '410kg', autoSync: true, revisions: [] }, grade: { time: at(-1, '08:00'), operator: '陈小忠', params: '一级336kg', autoSync: true, revisions: [] }, cold: { time: at(-1, '09:00'), operator: '陈小忠', params: 'LK-A 7.4t', autoSync: true, revisions: [] } } }
    ],
    blockchain: [
      { id: 'BC-261116-01', batch: 'MJ-261115-01', node: '采收', contentType: '采收记录', hash: '0x8f3a…c21d', height: 1842261, tx: '0x51b9…08aa', time: at(0, '06:25'), status: '已确认', retryCount: 0, nextRetry: null },
      { id: 'BC-261116-02', batch: 'MJ-261115-01', node: '冷链', contentType: '冷链流通', hash: '0x2c77…9e04', height: 1842290, tx: '0x90d2…71bc', time: at(0, '08:12'), status: '已确认', retryCount: 0, nextRetry: null },
      { id: 'BC-261116-03', batch: 'MJ-261115-02', node: '采收', contentType: '采收记录', hash: '0x41be…77f0', height: 1842263, tx: '0x33a8…c9d1', time: at(0, '06:45'), status: '已确认', retryCount: 0, nextRetry: null },
      { id: 'BC-261115-04', batch: 'MJ-261110-08', node: '冷链', contentType: '冷链流通', hash: '0x6d02…b315', height: 1841902, tx: '0x77c1…2e08', time: at(-1, '09:05'), status: '已确认', retryCount: 0, nextRetry: null },
      { id: 'BC-261115-05', batch: 'MJ-261112-07', node: '分级', contentType: '分级预冷', hash: '0x9a44…10cf', height: 1841877, tx: '0x12f6…8b3e', time: at(-1, '08:20'), status: '已确认', retryCount: 0, nextRetry: null },
      { id: 'BC-261115-06', batch: 'MJ-261115-03', node: '灭菌', contentType: '灭菌接种', hash: '0x0e58…d4a9', height: 0, tx: '—', time: at(0, '02:20'), status: '上链失败', retryCount: 3, nextRetry: at(0, '10:20') },
      { id: 'BC-261116-07', batch: 'MJ-261115-04', node: '培养', contentType: '发菌培养', hash: '0x7b21…e08c', height: 0, tx: '—', time: at(0, '09:00'), status: '上链中', retryCount: 1, nextRetry: at(0, '09:30') },
      { id: 'BC-261116-08', batch: 'MJ-261116-01', node: '菌包', contentType: '菌包制备', hash: '—', height: 0, tx: '—', time: at(0, '06:35'), status: '待上链', retryCount: 0, nextRetry: null }
    ],
    recalls: [
      { id: 'RC-261116-01', batch: 'MJ-261110-08', scope: 'SNJG-20261110-08001 起 60 箱', level: '二级', reason: '抽检褐变率偏高，预防性召回', status: '通知中', frozen: true, recovery: 42.5, operator: '周明轩', time: at(0, '10:00'), report: 'RC-261116-01.pdf',
        flow: [ { node: '厂区冷库', qty: 60, status: '已冻结' }, { node: '湘冷物流·湘A·C2618', qty: 24, status: '在途拦截' }, { node: '商超配送·长沙', qty: 20, status: '已通知' }, { node: '批发市场·望城', qty: 16, status: '已通知' } ],
        ledger: [ { code: 'SNJG-20261110-08001', qty: 20, dest: '商超配送·长沙', state: '已召回', handler: '陈小忠', time: at(0, '11:00') }, { code: 'SNJG-20261110-08002', qty: 16, dest: '批发市场·望城', state: '召回中', handler: '陈小忠', time: at(0, '11:20') }, { code: 'SNJG-20261110-08003', qty: 24, dest: '湘冷物流·在途', state: '待召回', handler: '—', time: null } ] },
      { id: 'RC-261110-02', batch: 'MJ-261108-05', scope: '演练批次 120 箱', level: '三级', reason: '召回演练（模拟污染超标）', status: '已完成', frozen: true, recovery: 98.6, operator: '周明轩', time: at(-8, '09:00'), report: 'RC-261110-02.pdf',
        flow: [ { node: '厂区冷库', qty: 120, status: '已冻结' }, { node: '商超配送·长沙', qty: 70, status: '已召回' }, { node: '批发市场·望城', qty: 50, status: '已召回' } ],
        ledger: [ { code: 'SNJG-20261108-05001', qty: 70, dest: '商超配送·长沙', state: '已销毁', handler: '陈小忠', time: at(-7, '15:00') }, { code: 'SNJG-20261108-05002', qty: 50, dest: '批发市场·望城', state: '已销毁', handler: '陈小忠', time: at(-7, '16:00') } ] }
    ],
    regulatory: [
      { id: 'RP-261116-01', type: '批次报文', batch: 'MJ-261116-01', count: 1, status: '成功', receipt: '湘监收〔2026〕1116-01', time: at(0, '07:00') },
      { id: 'RP-261116-02', type: '采收报文', batch: 'MJ-261115-01', count: 5, status: '成功', receipt: '湘监收〔2026〕1116-02', time: at(0, '08:30') },
      { id: 'RP-261115-03', type: '批次报文', batch: 'MJ-261115-03', count: 2, status: '死信', receipt: '—', time: at(-1, '10:20') },
      { id: 'RP-261115-04', type: '冷链报文', batch: 'MJ-261110-08', count: 3, status: '成功', receipt: '湘监收〔2026〕1115-04', time: at(-1, '09:10') },
      { id: 'RP-261116-05', type: '灭菌报文', batch: 'MJ-261115-01', count: 2, status: '成功', receipt: '湘监收〔2026〕1116-05', time: at(0, '05:00') },
      { id: 'RP-261116-06', type: '接种报文', batch: 'MJ-261115-02', count: 2, status: '成功', receipt: '湘监收〔2026〕1116-06', time: at(0, '09:20') },
      { id: 'RP-261116-07', type: '环境报文', batch: 'GF-02', count: 24, status: '成功', receipt: '湘监收〔2026〕1116-07', time: at(0, '09:45') },
      { id: 'RP-261116-08', type: '分级报文', batch: 'MJ-261112-07', count: 3, status: '成功', receipt: '湘监收〔2026〕1116-08', time: at(0, '08:25') },
      { id: 'RP-261115-09', type: '投入品报文', batch: 'MJ-261116-01', count: 4, status: '死信', receipt: '—', time: at(-1, '10:26') },
      { id: 'RP-261116-10', type: '召回报文', batch: 'MJ-261110-08', count: 1, status: '成功', receipt: '湘监收〔2026〕1116-10', time: at(0, '10:05') }
    ],

    /* —— 五级空间档案（厂区→车间→出菇房→层架→架位）—— */
    spaces: buildSpaces(),

    /* —— 配方模板（结构化环境上下限 + 版本化下发，全局参数源）—— */
    recipeTemplates: [
      { id: 'TPL-01', name: '平菇出菇环境模板', variety: '平菇', version: 'v4.1', status: '启用', effective: at(-20, '00:00'), temp: [15, 20], hum: [85, 95], co2: [0, 800], light: [200, 400], wind: [0.1, 0.3], negPressure: [-15, -8], author: '徐水应', rooms: ['GF-01', 'GF-05'] },
      { id: 'TPL-02', name: '杏鲍菇出菇环境模板', variety: '杏鲍菇', version: 'v3.6', status: '启用', effective: at(-35, '00:00'), temp: [14, 18], hum: [85, 95], co2: [0, 800], light: [200, 350], wind: [0.1, 0.25], negPressure: [-15, -8], author: '徐水应', rooms: ['GF-02', 'GF-06'] },
      { id: 'TPL-03', name: '金针菇出菇环境模板', variety: '金针菇', version: 'v2.9', status: '启用', effective: at(-50, '00:00'), temp: [10, 14], hum: [90, 95], co2: [0, 600], light: [100, 200], wind: [0.05, 0.2], negPressure: [-12, -6], author: '徐水应', rooms: ['GF-03'] },
      { id: 'TPL-04', name: '香菇出菇环境模板', variety: '香菇', version: 'v3.0', status: '启用', effective: at(-40, '00:00'), temp: [12, 18], hum: [85, 90], co2: [0, 800], light: [150, 300], wind: [0.1, 0.3], negPressure: [-15, -8], author: '徐水应', rooms: ['GF-04'] },
      { id: 'TPL-05', name: '菌丝培养环境模板', variety: '全品种', version: 'v2.0', status: '启用', effective: at(-70, '00:00'), temp: [22, 25], hum: [60, 70], co2: [0, 2000], light: [0, 0], wind: [0, 0.1], negPressure: [-12, -6], author: '徐水应', rooms: ['PY-01'] }
    ],
    /* —— 接种等级（A/B/C，沉降菌与洁净度判定）—— */
    inocGrades: [
      { id: 'A', name: 'A 级（优）', clean: '100 级', settle: '≤ 1.0 cfu/皿', infection: '≤ 0.5%', desc: '可直接进入培养，污染风险最低' },
      { id: 'B', name: 'B 级（合格）', clean: '100 级', settle: '1.0-3.5 cfu/皿', infection: '0.5%-1.5%', desc: '合格放行，加密污染巡查' },
      { id: 'C', name: 'C 级（不合格）', clean: '低于 100 级', settle: '> 3.5 cfu/皿', infection: '> 1.5%', desc: '禁止放行，重新灭菌接种并追责' }
    ],
    /* —— 生长曲线模板（积温 + 天数双条件转潮/出菇判定）—— */
    curveTemplates: [
      { id: 'CT-01', variety: '平菇', accumTemp: 560, days: 24, condition: '积温≥560°C·d 且 天数≥24', turnStd: '菌丝满袋后 3-5 天现蕾', author: '徐水应' },
      { id: 'CT-02', variety: '杏鲍菇', accumTemp: 520, days: 26, condition: '积温≥520°C·d 且 天数≥26', turnStd: '菌丝满袋后 5-7 天现蕾', author: '徐水应' },
      { id: 'CT-03', variety: '金针菇', accumTemp: 420, days: 22, condition: '积温≥420°C·d 且 天数≥22', turnStd: '菌丝满袋后 4-6 天现蕾', author: '徐水应' },
      { id: 'CT-04', variety: '香菇', accumTemp: 640, days: 30, condition: '积温≥640°C·d 且 天数≥30', turnStd: '转色完成后 5-8 天现蕾', author: '徐水应' }
    ],
    /* —— 供应商档案（菌种 / 原料 / 辅料 / 菌袋）—— */
    suppliers: [
      { id: 'SP-01', name: '湘菌种业有限公司', category: '菌种', contact: '刘育种', phone: '0731-8666 1001', license: '菌种生产经营许可证', qual: '合格', audit: at(-90, '00:00'), items: '平菇/杏鲍菇栽培种' },
      { id: 'SP-02', name: '华中菌种研究所', category: '菌种', contact: '王菌研', phone: '0731-8666 1002', license: '菌种生产经营许可证', qual: '合格', audit: at(-120, '00:00'), items: '金针菇/香菇液体种' },
      { id: 'SP-03', name: '湘西北林业合作社', category: '原料', contact: '向林业', phone: '0744-822 3003', license: '营业执照', qual: '合格', audit: at(-60, '00:00'), items: '阔叶木屑' },
      { id: 'SP-04', name: '常德粮油副产公司', category: '原料', contact: '陈粮油', phone: '0736-722 4004', license: '营业执照', qual: '合格', audit: at(-45, '00:00'), items: '麦麸/玉米面/豆粕' },
      { id: 'SP-05', name: '豫东秸秆合作社', category: '原料', contact: '赵秸秆', phone: '0370-222 5005', license: '营业执照', qual: '合格', audit: at(-80, '00:00'), items: '玉米芯' },
      { id: 'SP-06', name: '新疆棉业副产公司', category: '原料', contact: '阿棉业', phone: '0997-222 6006', license: '营业执照', qual: '待复核', audit: at(-15, '00:00'), items: '棉籽壳' },
      { id: 'SP-07', name: '台州塑业包装厂', category: '菌袋', contact: '周塑业', phone: '0576-822 7007', license: '食品级包装生产许可', qual: '合格', audit: at(-100, '00:00'), items: 'PP 菌袋/周转筐' },
      { id: 'SP-08', name: '本地建材化验级', category: '辅料', contact: '李建材', phone: '0731-8666 8008', license: '营业执照', qual: '合格', audit: at(-30, '00:00'), items: '生石灰/轻质碳酸钙/石膏' }
    ],
    /* —— 库存变动流水（入库/出库/盘点/报废，联动库存）—— */
    materialMoves: [
      { id: 'MM-261116-01', type: '出库', material: 'M-01', qty: 3200, ref: 'PB-261116-01', operator: '黄忠坚', time: at(0, '06:10'), note: '拌料领用' },
      { id: 'MM-261116-02', type: '出库', material: 'M-02', qty: 800, ref: 'PB-261116-01', operator: '黄忠坚', time: at(0, '06:12'), note: '拌料领用' },
      { id: 'MM-261116-03', type: '出库', material: 'M-06', qty: 60, ref: 'PB-261116-01', operator: '黄忠坚', time: at(0, '06:14'), note: '石灰 1%' },
      { id: 'MM-261115-04', type: '入库', material: 'M-01', qty: 12000, ref: 'PO-261112-01', operator: '陈小忠', time: at(-3, '10:00'), note: '木屑采购入库 检验合格' },
      { id: 'MM-261115-05', type: '入库', material: 'M-05', qty: 60000, ref: 'PO-261110-03', operator: '陈小忠', time: at(-5, '11:00'), note: '菌袋采购入库' },
      { id: 'MM-261114-06', type: '盘点', material: 'M-04', qty: -120, ref: 'PD-261114-01', operator: '陈小忠', time: at(-4, '16:00'), note: '盘亏 120kg 待复核' },
      { id: 'MM-261113-07', type: '报废', material: 'M-04', qty: 200, ref: 'BF-261113-01', operator: '陈小忠', time: at(-5, '09:00'), note: '棉籽壳霉变报废' }
    ],
    /* —— 菌袋档案（一批一码，装袋→灭菌→接种→培养流转）—— */
    bags: [
      { id: 'BD261116-0001', batch: 'MJ-261116-01', recipe: 'PB-01', strain: 'EG-01', weight: 1.15, moisture: 62, ph: 7.4, status: '已装袋', sterilize: null, inoculate: null, time: at(0, '06:30') },
      { id: 'BD261116-0002', batch: 'MJ-261116-01', recipe: 'PB-01', strain: 'EG-01', weight: 1.16, moisture: 62, ph: 7.4, status: '已装袋', sterilize: null, inoculate: null, time: at(0, '06:31') },
      { id: 'BD261115-0101', batch: 'MJ-261115-01', recipe: 'PB-01', strain: 'EG-01', weight: 1.14, moisture: 62, ph: 7.3, status: '已出菇', sterilize: 'ST-261115-01', inoculate: 'JZ-261115-01', time: at(-26, '10:00') },
      { id: 'BD261115-0201', batch: 'MJ-261115-02', recipe: 'PB-02', strain: 'EG-02', weight: 1.18, moisture: 63, ph: 7.2, status: '已出菇', sterilize: 'ST-261115-02', inoculate: 'JZ-261115-02', time: at(-26, '10:20') },
      { id: 'BD261115-0301', batch: 'MJ-261115-03', recipe: 'PB-03', strain: 'EG-03', weight: 1.12, moisture: 61, ph: 7.5, status: '待复判', sterilize: 'ST-261116-03', inoculate: null, time: at(-2, '08:00') },
      { id: 'BD261115-0401', batch: 'MJ-261115-04', recipe: 'PB-04', strain: 'EG-04', weight: 1.20, moisture: 60, ph: 7.0, status: '培养中', sterilize: 'ST-261115-04', inoculate: 'JZ-261115-04', time: at(-18, '10:00') }
    ],
    /* —— 岗位档案（关键工序需持证）—— */
    positions: [
      { id: 'POS-01', name: '拌料工', key: false, cert: '—', desc: '配方称量与拌料均匀度' },
      { id: 'POS-02', name: '灭菌工', key: true, cert: '灭菌锅操作证（压力容器）', desc: '高压灭菌曲线监控与复判' },
      { id: 'POS-03', name: '接种工', key: true, cert: '无菌操作培训证', desc: '无菌接种与沉降菌监测' },
      { id: 'POS-04', name: '培养工', key: false, cert: '—', desc: '翻袋/补水/污染巡查' },
      { id: 'POS-05', name: '出菇管理工', key: false, cert: '—', desc: '环境调控/喷淋补光/畸形菇检查' },
      { id: 'POS-06', name: '采收分拣工', key: true, cert: '健康证', desc: '采收/分级/磅重复核' },
      { id: 'POS-07', name: '冷链仓管', key: true, cert: '叉车证', desc: '预冷/入库绑码/出库复核' },
      { id: 'POS-08', name: '设备运维', key: true, cert: '电工证', desc: '设备巡检/维修/保养' },
      { id: 'POS-09', name: '质检员', key: true, cert: '食品检验员证', desc: '抽检/污染率/不合格处置' }
    ],
    /* —— 人员档案（工号 / 持证 / 到期预警）—— */
    personnel: [
      { id: 'P-001', name: '黄忠坚', team: 'T-01', position: 'POS-01', cert: '—', certNo: '—', certExpire: null, status: '在岗', phone: '138****1001' },
      { id: 'P-002', name: '陈小忠', team: 'T-07', position: 'POS-07', cert: '叉车证', certNo: 'CC-2024-0731', certExpire: at(220, '00:00'), status: '在岗', phone: '138****1002' },
      { id: 'P-003', name: '朱泉龙', team: 'T-02', position: 'POS-02', cert: '灭菌锅操作证', certNo: 'YL-2023-0412', certExpire: at(160, '00:00'), status: '在岗', phone: '138****1003' },
      { id: 'P-004', name: '张才孙', team: 'T-08', position: 'POS-08', cert: '电工证', certNo: 'DG-2022-0808', certExpire: at(400, '00:00'), status: '在岗', phone: '138****1004' },
      { id: 'P-005', name: '周明轩', team: 'T-03', position: 'POS-03', cert: '无菌操作培训证', certNo: 'WJ-2024-0215', certExpire: at(300, '00:00'), status: '在岗', phone: '138****1005' },
      { id: 'P-006', name: '廖春亮', team: 'T-03', position: 'POS-03', cert: '无菌操作培训证', certNo: 'WJ-2024-0216', certExpire: at(18, '00:00'), status: '在岗', phone: '138****1006' },
      { id: 'P-007', name: '徐水应', team: 'T-04', position: 'POS-04', cert: '—', certNo: '—', certExpire: null, status: '在岗', phone: '138****1007' },
      { id: 'P-008', name: '惠加宁', team: 'T-05', position: 'POS-06', cert: '健康证', certNo: 'JK-2025-1101', certExpire: at(-3, '00:00'), status: '禁派', phone: '138****1008' },
      { id: 'P-009', name: '李质检', team: 'T-05', position: 'POS-09', cert: '食品检验员证', certNo: 'SP-2023-0909', certExpire: at(25, '00:00'), status: '在岗', phone: '138****1009' }
    ],
    /* —— 派工单（关键工序无有效证不得派工，操作记录入追溯链）—— */
    dispatches: [
      { id: 'DP-261116-01', batch: 'MJ-261116-01', process: '拌料', position: 'POS-01', person: 'P-001', team: 'T-01', plan: at(0, '06:00'), status: '已完成', certOK: true, operator: '黄忠坚', time: at(0, '06:00') },
      { id: 'DP-261116-02', batch: 'MJ-261116-01', process: '灭菌', position: 'POS-02', person: 'P-003', team: 'T-02', plan: at(0, '14:00'), status: '待执行', certOK: true, operator: '朱泉龙', time: at(0, '08:00') },
      { id: 'DP-261116-03', batch: 'MJ-261115-01', process: '采收', position: 'POS-06', person: 'P-008', team: 'T-06', plan: at(0, '05:30'), status: '已阻断', certOK: false, blockReason: '健康证已过期，自动禁派', operator: '系统', time: at(0, '05:00') },
      { id: 'DP-261116-04', batch: 'MJ-261115-01', process: '采收', position: 'POS-06', person: 'P-002', team: 'T-06', plan: at(0, '06:00'), status: '已完成', certOK: true, operator: '陈小忠', time: at(0, '06:00') },
      { id: 'DP-261115-05', batch: 'MJ-261115-04', process: '接种', position: 'POS-03', person: 'P-006', team: 'T-03', plan: at(-16, '09:00'), status: '已完成', certOK: true, operator: '廖春亮', time: at(-16, '09:00') }
    ],
    /* —— 装袋称重抽检（每 50 袋抽检 + 发菌上架≤装袋守恒校验）—— */
    weighSamples: [
      { id: 'WS-261116-01', batch: 'MJ-261116-01', bagCount: 4000, sampleEvery: 50, samples: 80, avgWeight: 1.15, stdWeight: 1.15, passRate: 97.5, racked: 0, conservation: '待上架', blocked: false, operator: '李质检', time: at(0, '07:00') },
      { id: 'WS-261115-01', batch: 'MJ-261115-01', bagCount: 4200, sampleEvery: 50, samples: 84, avgWeight: 1.14, stdWeight: 1.15, passRate: 98.8, racked: 4180, conservation: '守恒通过', blocked: false, operator: '李质检', time: at(-26, '11:00') },
      { id: 'WS-261115-02', batch: 'MJ-261115-02', bagCount: 3800, sampleEvery: 50, samples: 76, avgWeight: 1.18, stdWeight: 1.18, passRate: 96.1, racked: 3790, conservation: '守恒通过', blocked: false, operator: '李质检', time: at(-26, '11:30') },
      { id: 'WS-261115-04', batch: 'MJ-261115-04', bagCount: 3600, sampleEvery: 50, samples: 72, avgWeight: 1.20, stdWeight: 1.20, passRate: 94.4, racked: 3650, conservation: '超发阻断', blocked: true, operator: '李质检', time: at(-18, '11:00') }
    ],
    /* —— 联动策略（触发→目标→动作→延时→锁定→复位）—— */
    linkages: [
      { id: 'LK-01', trigger: 'CO₂ > 800ppm 持续 5min', target: '新风风机（同菇房）', action: '联动启动至 CO₂ < 700ppm', delay: 0, lock: '手动复位', reset: 'CO₂ < 650ppm 自动复位', enabled: true },
      { id: 'LK-02', trigger: '温度超出配方 ±2°C', target: '冷水机组/电加热', action: '制冷/制热回调至区间中值', delay: 60, lock: '自动', reset: '回到区间自动复位', enabled: true },
      { id: 'LK-03', trigger: 'RH < 85% 持续 10min', target: '超声波雾化加湿器', action: '加湿至 RH 90%', delay: 0, lock: '自动', reset: 'RH ≥ 88% 自动复位', enabled: true },
      { id: 'LK-04', trigger: '污染率 ≥ 3.0%', target: '出菇房出菇流程', action: '阻断出菇并加密杂菌检查', delay: 0, lock: '人工复核', reset: '质检复核合格后手动复位', enabled: true },
      { id: 'LK-05', trigger: '层间温差 > 1.5°C', target: '层架循环风机', action: '定时运行 15min', delay: 0, lock: '自动', reset: '温差 < 1.0°C 自动复位', enabled: false },
      { id: 'LK-06', trigger: '预冷区温度 > 4°C', target: '预冷区出库流程', action: '阻断出库并启动制冷', delay: 0, lock: '人工复核', reset: '温度 ≤ 4°C 且复核后复位', enabled: true },
      { id: 'LK-07', trigger: '接种洁净度低于 B 级', target: '接种车间开工', action: '禁止开工并启动紫外/净化', delay: 0, lock: '人工复核', reset: '洁净度达 A 级复核后复位', enabled: true }
    ],
    /* —— 冷库巡检 / 除霜记录 —— */
    storageInspections: [
      { id: 'SI-261116-01', zone: 'YL-01', type: '巡检', temp: 5.6, hum: 90, result: '温度越限', action: '出库阻断 + 制冷检修', operator: '陈小忠', time: at(0, '06:47') },
      { id: 'SI-261116-02', zone: 'LK-A', type: '巡检', temp: 2.8, hum: 88, result: '正常', action: '—', operator: '陈小忠', time: at(0, '08:00') },
      { id: 'SI-261115-03', zone: 'LK-B', type: '除霜', temp: 3.1, hum: 87, result: '正常', action: '蒸发器除霜 30min', operator: '廖春亮', time: at(-1, '03:00') },
      { id: 'SI-261115-04', zone: 'LK-A', type: '除霜', temp: 2.9, hum: 88, result: '正常', action: '蒸发器除霜 30min', operator: '廖春亮', time: at(-2, '03:00') }
    ],
    /* —— 监管每日对账（差异清单）—— */
    reconciliations: [
      { id: 'RC-261116-01', date: dayKey(0), local: 38, platform: 36, diff: 2, status: '有差异', items: [ { type: '投入品报文', local: 4, platform: 2, reason: '2 条进入死信队列待重发' }, { type: '批次报文', local: 1, platform: 1, reason: '一致' } ], operator: '系统对账', time: at(0, '09:00') },
      { id: 'RC-261115-01', date: dayKey(-1), local: 42, platform: 42, diff: 0, status: '一致', items: [ { type: '全部报文', local: 42, platform: 42, reason: '一致' } ], operator: '系统对账', time: at(-1, '09:00') },
      { id: 'RC-261114-01', date: dayKey(-2), local: 40, platform: 39, diff: 1, status: '有差异', items: [ { type: '冷链报文', local: 3, platform: 2, reason: '1 条回执超时已补发' } ], operator: '系统对账', time: at(-2, '09:00') }
    ],
    /* —— 数据字典（品种 / 污染类型 / 畸形类型 / 不合格类型 / 处置）—— */
    dictionaries: [
      { id: 'DIC-VAR', name: '食用菌品种', items: ['平菇', '杏鲍菇', '金针菇', '香菇'] },
      { id: 'DIC-POLL', name: '杂菌污染类型', items: ['绿霉', '青霉', '曲霉', '链孢霉'] },
      { id: 'DIC-DEFORM', name: '畸形菇类型', items: ['菇盖畸形', '斑点病', '褐变', '开伞'] },
      { id: 'DIC-NC', name: '不合格品类型', items: ['农残超标', '重金属超标', '微生物超标', '感官不合格', '异物'] },
      { id: 'DIC-DISPOSAL', name: '不合格处置方式', items: ['销毁', '降级', '退回', '无害化处理'] },
      { id: 'DIC-GRADE', name: '产品分级', items: ['一级', '二级', '废品'] },
      { id: 'DIC-TEMP', name: '冷链温区', items: ['预冷 0-4°C', '冷藏 2-8°C', '冷冻 ≤-18°C'] }
    ],
    /* —— 参数三级覆盖（全局模板→菇房→批次，就近生效）—— */
    paramOverrides: [
      { id: 'PO-01', level: '全局', scope: 'TPL-01', metric: 'CO₂ 上限', value: 800, unit: 'ppm', source: '配方模板', operator: '徐水应', time: at(-20, '00:00') },
      { id: 'PO-02', level: '菇房', scope: 'GF-02', metric: 'CO₂ 上限', value: 750, unit: 'ppm', source: '菇房覆盖', operator: '徐水应', time: at(-5, '00:00') },
      { id: 'PO-03', level: '批次', scope: 'MJ-261115-01', metric: '温度下限', value: 16, unit: '°C', source: '批次覆盖', operator: '惠加宁', time: at(-8, '00:00') },
      { id: 'PO-04', level: '菇房', scope: 'GF-03', metric: 'RH 下限', value: 90, unit: '%', source: '菇房覆盖', operator: '徐水应', time: at(-10, '00:00') }
    ],

    /* ============================================================
     * 追溯统计口径 —— 全平台单点定义
     * ------------------------------------------------------------
     * 大屏（da_index.html 质量追溯视图）、追溯码管理、溯源统计
     * 等页面一律读取本节，禁止各自硬编码，避免跨页口径打架。
     *
     * 口径约束（改动时须同步校验）：
     *   1) codeStatus 各项之和 === totalIssued（累计发码总量）
     *   2) totalBatches（累计上链批次）<= totalIssued（每批次至少一个码）
     *   3) channels 各项之和 === todayScan（今日扫码量）
     *   4) provinces 为近 30 日累计，与 trend（近 7 日单日）口径不同，
     *      展示时必须分别标注，不可混用
     * ============================================================ */
    traceStats: {
      /* —— 追溯码 —— */
      totalIssued: 155300,      // 累计发码总量
      thisMonth: 18600,         // 本月新增发码
      activated: 96300,         // 已激活码
      codeStatus: [
        { name: '已激活', value: 96300, ratio: 62 },
        { name: '未激活', value: 32600, ratio: 21 },
        { name: '已过期', value: 17100, ratio: 11 },
        { name: '已作废', value: 9300,  ratio: 6 }
      ],
      /* —— 批次 —— */
      totalBatches: 108420,     // 累计上链批次
      traceCoverage: 97.2,      // 追溯覆盖率（累计批次口径）
      chainIntegrity: 96.4,     // 链完整率（累计已上链环节占比）
      chainSuccessRate: 99.6,   // 上链成功率
      chainNodes: 6,            // 存证节点数
      chainConsensus: 'Raft 共识 · 6 节点',

      /* —— 扫码（今日口径）—— */
      todayScan: 12860,
      dod: 8.2,                 // 环比 %
      avgResponse: 0.8,         // 平均查询响应（秒）
      satisfaction: 4.8,        // 消费者满意度
      channels: [
        { name: '微信扫码', value: 7973, ratio: 62 },
        { name: '支付宝',   value: 2315, ratio: 18 },
        { name: '企业 App', value: 1672, ratio: 13 },
        { name: '网页查询', value: 900,  ratio: 7 }
      ],
      /* —— 扫码地理（近 30 日累计口径）—— */
      provinceTotal: 18,
      provinces: [
        { name: '新疆', value: 58600 }, { name: '广东', value: 31200 },
        { name: '浙江', value: 26400 }, { name: '江苏', value: 23800 },
        { name: '上海', value: 19600 }, { name: '北京', value: 17900 },
        { name: '山东', value: 15200 }, { name: '河南', value: 13100 },
        { name: '四川', value: 11800 }, { name: '陕西', value: 10600 },
        { name: '福建', value: 9400 },  { name: '湖北', value: 8200 },
        { name: '湖南', value: 7500 },  { name: '安徽', value: 6900 },
        { name: '河北', value: 6100 },  { name: '辽宁', value: 5400 },
        { name: '天津', value: 4200 },  { name: '甘肃', value: 3300 }
      ],
      /* —— 扫码趋势（近 7 日单日口径）—— */
      trend: [
        { date: '11-10', value: 10120 }, { date: '11-11', value: 10840 },
        { date: '11-12', value: 11460 }, { date: '11-13', value: 10920 },
        { date: '11-14', value: 11880 }, { date: '11-15', value: 12240 },
        { date: '11-16', value: 12860 }
      ],
      /* —— 批次流向（食用菌工序口径，与大屏 TR_FLOW_ROWS 一致）—— */
      flow: {
        base:     [ {name:'平菇', value:38200}, {name:'杏鲍菇', value:34600}, {name:'金针菇', value:22100}, {name:'香菇', value:13520} ],
        harvest:  [ {name:'一级菇', value:62100}, {name:'二级菇', value:32600}, {name:'畸形菇', value:13720} ],
        package:  [ {name:'预冷库', value:58400}, {name:'冷藏库', value:37200}, {name:'加工级', value:12820} ],
        channel:  [ {name:'产地直发', value:48600}, {name:'商超配送', value:33900}, {name:'电商专线', value:25920} ],
        consumer: [ {name:'商超门店', value:42800}, {name:'电商到家', value:35100}, {name:'餐饮直供', value:30520} ],
        thisWeek: 2860,
        channelCount: 12,
        avgDuration: 4.2
      },
      /* —— 风险扫码（窜货 / 异地高频 / 过期码查询）—— */
      risks: [
        { id: 'RSK-261116-01', code: 'TR-261110-08001', region: '广东省深圳市', reason: '授权区域外高频扫码，疑似窜货', level: 'high', time: at(0, '09:18') },
        { id: 'RSK-261116-02', code: 'TR-261115-02001', region: '浙江省杭州市', reason: '单码 10 分钟内重复查询 7 次', level: 'medium', time: at(0, '08:47') },
        { id: 'RSK-261115-03', code: 'TR-261112-07001', region: '四川省成都市', reason: '追溯码已过期仍被扫码查询', level: 'medium', time: at(-1, '21:33') },
        { id: 'RSK-261115-04', code: 'TR-261115-01001', region: '河南省郑州市', reason: '销区外首次扫码，需复核渠道', level: 'low', time: at(-1, '17:09') }
      ]
    }
  };

  var ENV_BASE = {
    'GF-01': { temp: 18.2, hum: 88, co2: 620, light: 260, clean: 'A', pressDiff: -10 },
    'GF-02': { temp: 16.8, hum: 90, co2: 986, light: 300, clean: 'A', pressDiff: -11 },
    'GF-03': { temp: 12.5, hum: 92, co2: 540, light: 180, clean: 'A', pressDiff: -9 },
    'GF-04': { temp: 15.6, hum: 87, co2: 700, light: 220, clean: 'B', pressDiff: -10 },
    'GF-05': { temp: 18.6, hum: 89, co2: 640, light: 260, clean: 'A', pressDiff: -12 },
    'GF-06': { temp: 16.2, hum: 91, co2: 580, light: 300, clean: 'A', pressDiff: -10 },
    'PY-01': { temp: 23.4, hum: 65, co2: 1200, light: 0, clean: 'B', pressDiff: -8 },
    'YL-01': { temp: 5.6, hum: 90, co2: 0, light: 0, clean: 'B', pressDiff: -6 },
    'LK-A': { temp: 2.8, hum: 88, co2: 0, light: 0, clean: 'B', pressDiff: -6 },
    'LK-B': { temp: 3.1, hum: 87, co2: 0, light: 0, clean: 'B', pressDiff: -6 }
  };

  var KEY = 'mushroom_fungi_store_v1';
  var db = null;
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object' && saved.batches) db = saved;
  } catch (e) { /* 回退种子 */ }
  if (!db) db = JSON.parse(JSON.stringify(SEED));
  /* 旧版本缓存缺少 traceStats 字段时，用种子补齐，保证口径定义始终存在 */
  if (!db.traceStats) db.traceStats = JSON.parse(JSON.stringify(SEED.traceStats));
  /* 新增集合迁移：旧缓存缺少的集合用种子补齐，已有集合（含用户改动）保持不动 */
  Object.keys(SEED).forEach(function (col) {
    if (!db[col]) db[col] = JSON.parse(JSON.stringify(SEED[col]));
  });
  /* 企业更名：旧缓存中的旧公司名精确替换为新名，用户自定义值不动 */
  (db.enterprise || []).forEach(function (x) {
    if (x.id === 'EN-01' && x.value === '湖南智农数果科技有限公司') x.value = '托克逊县数字农业科技有限公司';
  });
  function persist(col) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    global.dispatchEvent(new CustomEvent('fungiStoreChange', { detail: { col: col } }));
  }
  function seq(col, prefix) {
    var n = db[col].length + 1;
    var id;
    do { id = prefix + '-' + dayKey(0).slice(2).replace(/-/g, '') + '-' + pad2(n); n++; }
    while (db[col].some(function (x) { return x.id === id; }));
    return id;
  }

  var api = {
    collections: Object.keys(SEED),
    list: function (col) { return (db[col] || []).slice(); },
    get: function (col, id) { return (db[col] || []).filter(function (x) { return x.id === id; })[0] || null; },
    add: function (col, obj) {
      if (!obj.id) obj.id = seq(col, col.slice(0, 2).toUpperCase());
      db[col].unshift(obj);
      persist(col);
      return obj;
    },
    update: function (col, id, patch) {
      var x = this.get(col, id);
      if (!x) return null;
      Object.keys(patch).forEach(function (k) { x[k] = patch[k]; });
      persist(col);
      return x;
    },
    remove: function (col, id) {
      var i = (db[col] || []).findIndex(function (x) { return x.id === id; });
      if (i < 0) return null;
      var gone = db[col].splice(i, 1)[0];
      persist(col);
      return gone;
    },
    restore: function (col, obj, index) {
      db[col].splice(Math.min(index || 0, db[col].length), 0, obj);
      persist(col);
      return obj;
    },
    envCurrent: function (room) { return Object.assign({ room: room }, ENV_BASE[room] || ENV_BASE['GF-01']); },
    envRooms: Object.keys(ENV_BASE),
    envSeries: function (room, hours) {
      hours = hours || 24;
      var base = ENV_BASE[room] || ENV_BASE['GF-01'];
      var out = [];
      var now = new Date();
      for (var i = hours - 1; i >= 0; i--) {
        var d = new Date(now.getTime() - i * 3600000);
        var r = rng(hash(room) + d.getHours() + d.getDate() * 24);
        var wave = Math.sin((d.getHours() - 6) / 24 * Math.PI * 2);
        var co2 = base.co2 ? Math.round(base.co2 * (0.82 + 0.18 * r()) + (room === 'GF-02' && i < 6 ? 180 : 0)) : 0;
        out.push({
          t: pad2(d.getHours()) + ':00',
          temp: +(base.temp + wave * 0.8 + (r() - 0.5) * 0.6).toFixed(1),
          hum: Math.round(base.hum + wave * 2 + (r() - 0.5) * 3),
          co2: co2,
          light: base.light ? Math.round(base.light * (d.getHours() >= 6 && d.getHours() <= 18 ? 1 : 0.15)) : 0,
          clean: base.clean || 'A',
          pressDiff: Math.round((base.pressDiff || -10) + (r() - 0.5) * 2)
        });
      }
      return out;
    },
    stats: function () {
      var today = dayKey(0);
      var hv = db.harvest.filter(function (x) { return String(x.time).slice(0, 10) === today; });
      var kg = hv.reduce(function (s, x) { return s + x.kg; }, 0);
      var g1 = hv.reduce(function (s, x) { return s + x.grade1; }, 0);
      var pre = db.storage.filter(function (x) { return x.zone === 'YL-01'; }).reduce(function (s, x) { return s + x.tons; }, 0);
      return {
        batches: 36, envRate: 97.6, harvestToday: kg,
        grade1Rate: kg ? +(g1 / kg * 100).toFixed(1) : 0,
        trace: db.traceStats.totalIssued, traceMonth: db.traceStats.thisMonth,
        roomsInProd: db.rooms.filter(function (r) { return r.status === '在产'; }).length,
        roomsTotal: db.rooms.length,
        fullRate: 92.6, precool: +pre.toFixed(1), pollutionGF04: 2.8
      };
    },

    /* ============================================================
     * 追溯统计统一出口
     * ------------------------------------------------------------
     * 大屏 / 溯源统计 / 追溯码管理一律走这里，保证跨页同口径。
     * ============================================================ */
    traceStats: function () {
      var t = db.traceStats || SEED.traceStats;
      var chains = db.chain || [];
      var pending = 0, doneNodes = 0, totalNodes = 0;
      chains.forEach(function (c) {
        var nodes = (c && c.nodes) || {};
        Object.keys(nodes).forEach(function (k) {
          totalNodes++;
          if (nodes[k] != null) doneNodes++;
          else pending++;
        });
      });
      return {
        /* 追溯码 */
        totalIssued: t.totalIssued,
        thisMonth: t.thisMonth,
        activated: t.activated,
        activateRate: +(t.activated * 100 / t.totalIssued).toFixed(1),
        codeStatus: (t.codeStatus || []).map(function (x) { return { name: x.name, value: x.value, ratio: x.ratio }; }),
        /* 批次 */
        totalBatches: t.totalBatches,
        traceCoverage: t.traceCoverage,
        chainIntegrity: t.chainIntegrity,
        chainSuccessRate: t.chainSuccessRate,
        chainNodes: t.chainNodes,
        chainConsensus: t.chainConsensus,
        /* 扫码 */
        todayScan: t.todayScan,
        dod: t.dod,
        avgResponse: t.avgResponse,
        satisfaction: t.satisfaction,
        channels: (t.channels || []).map(function (x) { return { name: x.name, value: x.value, ratio: x.ratio }; }),
        provinceTotal: t.provinceTotal,
        provinces: (t.provinces || []).map(function (x) { return { name: x.name, value: x.value }; }),
        trend: (t.trend || []).map(function (x) { return { date: x.date, value: x.value }; }),
        flow: t.flow ? {
          base: (t.flow.base || []).map(function (x) { return { name: x.name, value: x.value }; }),
          harvest: (t.flow.harvest || []).map(function (x) { return { name: x.name, value: x.value }; }),
          package: (t.flow.package || []).map(function (x) { return { name: x.name, value: x.value }; }),
          channel: (t.flow.channel || []).map(function (x) { return { name: x.name, value: x.value }; }),
          consumer: (t.flow.consumer || []).map(function (x) { return { name: x.name, value: x.value }; }),
          thisWeek: t.flow.thisWeek,
          channelCount: t.flow.channelCount,
          avgDuration: t.flow.avgDuration
        } : {},
        risks: (t.risks || []).map(function (x) {
          return { id: x.id, code: x.code, region: x.region, reason: x.reason, level: x.level, time: x.time };
        }),
        /* 链路完成度（来自在制批次链） */
        chain: {
          batches: chains.length,
          pendingNodes: pending,
          totalNodes: totalNodes,
          doneNodes: doneNodes,
          completion: totalNodes ? +(doneNodes * 100 / totalNodes).toFixed(1) : 0
        },
        /* 召回与监管 */
        recall: {
          total: (db.recalls || []).length,
          active: (db.recalls || []).filter(function (r) { return r.status && r.status !== '已完成'; }).length,
          list: (db.recalls || []).slice()
        },
        regulatory: {
          total: (db.regulatory || []).length,
          success: (db.regulatory || []).filter(function (r) { return r.status === '成功'; }).length,
          dead: (db.regulatory || []).filter(function (r) { return r.status === '死信'; }).length,
          list: (db.regulatory || []).slice()
        },
        updatedAt: nowStamp()
      };
    },

    /** 口径自检：任一项不满足返回 false 并在控制台提示，用于避免跨页数值打架 */
    verifyTraceStats: function () {
      var t = db.traceStats || SEED.traceStats;
      var errs = [];
      var codeSum = (t.codeStatus || []).reduce(function (s, x) { return s + x.value; }, 0);
      if (codeSum !== t.totalIssued) errs.push('codeStatus 之和 ' + codeSum + ' ≠ totalIssued ' + t.totalIssued);
      if (t.totalBatches > t.totalIssued) errs.push('totalBatches ' + t.totalBatches + ' > totalIssued ' + t.totalIssued);
      var chSum = (t.channels || []).reduce(function (s, x) { return s + x.value; }, 0);
      if (chSum !== t.todayScan) errs.push('channels 之和 ' + chSum + ' ≠ todayScan ' + t.todayScan);
      var ratioSum = (t.codeStatus || []).reduce(function (s, x) { return s + x.ratio; }, 0);
      if (ratioSum !== 100) errs.push('codeStatus ratio 之和 ' + ratioSum + ' ≠ 100');
      if (errs.length) console.warn('[FungiStore] 追溯统计口径不自洽：', errs);
      return errs.length === 0;
    },
    resetAll: function () {
      db = JSON.parse(JSON.stringify(SEED));
      try { localStorage.removeItem(KEY); } catch (e) {}
      global.dispatchEvent(new CustomEvent('fungiStoreChange', { detail: { col: '*' } }));
    },
    dayKey: dayKey,
    at: at,
    nowStamp: nowStamp,
    curveMinTemp: curveMinTemp,
    curveComplete: curveComplete
  };
  global.FungiStore = api;
})(window);