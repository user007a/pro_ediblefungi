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
  function curve(hold, gap) {
    var pts = [], t = 0, temp = 24;
    for (var i = 0; i < 14; i++) {
      t += 15;
      if (i < 4) temp = 24 + i * 26;
      else if (i < 10) temp = 121 + (i % 2 ? 0.4 : -0.3);
      else temp = 121 - (i - 9) * 22;
      if (gap && i >= 6 && i <= 7) temp = null;
      pts.push({ t: t, temp: temp });
    }
    return pts;
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
      { id: 'EG-01', variety: '平菇', latin: 'Pleurotus ostreatus', generation: '栽培种', mother: 'P-2023-01', storage: '菌种库 4°C', activated: at(-40, '09:00'), bags: 42000, status: '在用' },
      { id: 'EG-02', variety: '杏鲍菇', latin: 'Pleurotus eryngii', generation: '栽培种', mother: 'E-2023-04', storage: '菌种库 4°C', activated: at(-35, '09:00'), bags: 38000, status: '在用' },
      { id: 'EG-03', variety: '金针菇', latin: 'Flammulina velutipes', generation: '栽培种', mother: 'F-2024-02', storage: '菌种库 4°C', activated: at(-28, '09:00'), bags: 40000, status: '在用' },
      { id: 'EG-04', variety: '香菇', latin: 'Lentinula edodes', generation: '栽培种', mother: 'L-2023-11', storage: '菌种库 4°C', activated: at(-52, '09:00'), bags: 36000, status: '在用' }
    ],
    materials: [
      { id: 'M-01', name: '木屑', spec: '阔叶木粗屑', unit: 'kg', stock: 26800, safety: 12000, supplier: '湘西北林业合作社', price: 0.62 },
      { id: 'M-02', name: '麦麸', spec: '中片新鲜', unit: 'kg', stock: 7400, safety: 4000, supplier: '常德粮油副产公司', price: 2.15 },
      { id: 'M-03', name: '玉米芯', spec: '粉碎 5-8mm', unit: 'kg', stock: 9200, safety: 5000, supplier: '豫东秸秆合作社', price: 0.85 },
      { id: 'M-04', name: '棉籽壳', spec: '中绒中壳', unit: 'kg', stock: 3600, safety: 4000, supplier: '新疆棉业副产公司', price: 1.45 },
      { id: 'M-05', name: '菌袋', spec: '17×33cm PP', unit: '只', stock: 186000, safety: 80000, supplier: '台州塑业包装厂', price: 0.09 },
      { id: 'M-06', name: '石灰', spec: '生石灰粉', unit: 'kg', stock: 1500, safety: 600, supplier: '本地建材化验级', price: 0.95 }
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
      { id: 'PB-261116-01', strain: 'EG-01', formula: '木屑78% 麦麸20% 石灰1% 石膏1%', moisture: 62, ph: 7.5, bags: 4000, bagWeight: 1.15, status: '装袋', operator: '黄忠坚', time: at(0, '06:30') },
      { id: 'PB-261116-02', strain: 'EG-02', formula: '木屑73% 麦麸25% 石灰1% 石膏1%', moisture: 63, ph: 7.2, bags: 3600, bagWeight: 1.2, status: '待灭菌', operator: '黄忠坚', time: at(0, '05:40') },
      { id: 'PB-261115-03', strain: 'EG-03', formula: '玉米芯40% 木屑38% 麦麸20% 石灰2%', moisture: 64, ph: 7.8, bags: 4000, bagWeight: 1.1, status: '已灭菌', operator: '陈小忠', time: at(-1, '06:10') }
    ],
    sterilize: [
      { id: 'ST-261116-01', pot: 'MJ-01', batch: 'MJ-261116-04', bags: 1800, hold: 120, peak: 121.4, operator: '张才孙', review: '通过', status: '已完成', time: at(0, '04:20'), curve: curve(120, false) },
      { id: 'ST-261116-02', pot: 'MJ-02', batch: 'MJ-261116-04', bags: 1800, hold: 120, peak: 121.2, operator: '张才孙', review: '通过', status: '已完成', time: at(0, '04:20'), curve: curve(120, false) },
      { id: 'ST-261116-03', pot: 'MJ-03', batch: 'MJ-261115-03', bags: 2000, hold: 108, peak: 121.1, operator: '朱泉龙', review: '待复判', status: '曲线缺口', time: at(0, '02:10'), curve: curve(108, true) },
      { id: 'ST-261115-04', pot: 'MJ-04', batch: 'MJ-261115-03', bags: 2000, hold: 120, peak: 121.6, operator: '朱泉龙', review: '通过', status: '已完成', time: at(-1, '02:10'), curve: curve(120, false) }
    ],
    inoculation: [
      { id: 'IN-261116-01', batch: 'MJ-261116-02', strain: 'EG-02', room: 'JZ-01', bags: 1800, amount: '15g/袋', operator: '周明轩', pollution: 0.4, time: at(0, '08:30') },
      { id: 'IN-261116-02', batch: 'MJ-261116-02', strain: 'EG-02', room: 'JZ-01', bags: 1800, amount: '15g/袋', operator: '周明轩', pollution: 0.6, time: at(0, '10:10') },
      { id: 'IN-261115-03', batch: 'MJ-261116-03', strain: 'EG-03', room: 'JZ-01', bags: 4000, amount: '12g/袋', operator: '廖春亮', pollution: 0.8, time: at(-5, '09:00') }
    ],
    cleanliness: [
      { id: 'CL-261116-01', room: 'JZ-01', settle: 0.8, particle: 320, limit: 3.5, pass: true, time: at(0, '07:40') },
      { id: 'CL-261116-02', room: 'JZ-01', settle: 1.2, particle: 410, limit: 3.5, pass: true, time: at(0, '12:40') },
      { id: 'CL-261115-03', room: 'JZ-01', settle: 3.8, particle: 980, limit: 3.5, pass: false, time: at(-1, '07:40') },
      { id: 'CL-261115-04', room: 'JZ-01', settle: 1.0, particle: 350, limit: 3.5, pass: true, time: at(-1, '12:40') }
    ],
    culture: [
      { id: 'CU-261115-04', batch: 'MJ-261115-04', shelf: 'PY-01-A03', days: 18, fullRate: 88.2, temp: 23.6, cullRate: 2.8, turnLast: at(-2, '10:00') },
      { id: 'CU-261116-03', batch: 'MJ-261116-03', shelf: 'PY-01-B01', days: 6, fullRate: 31.5, temp: 23.2, cullRate: 0.5, turnLast: at(-1, '10:00') },
      { id: 'CU-261115-01', batch: 'MJ-261115-01', shelf: 'PY-01-A01', days: 24, fullRate: 92.6, temp: 23.8, cullRate: 0.9, turnLast: at(-6, '10:00') },
      { id: 'CU-261115-02', batch: 'MJ-261115-02', shelf: 'PY-01-A02', days: 24, fullRate: 94.1, temp: 23.5, cullRate: 0.7, turnLast: at(-6, '10:00') }
    ],
    fruiting: [
      { id: 'FR-261115-01', batch: 'MJ-261115-01', room: 'GF-01', flush: 2, tempDiff: 8, hum: 90, co2: 620, light: 260, progress: '菇蕾分化', expect: at(5, '06:00') },
      { id: 'FR-261115-02', batch: 'MJ-261115-02', room: 'GF-02', flush: 2, tempDiff: 6, hum: 91, co2: 986, light: 300, progress: '子实体生长', expect: at(3, '06:00') },
      { id: 'FR-261112-07', batch: 'MJ-261112-07', room: 'GF-03', flush: 1, tempDiff: 4, hum: 92, co2: 540, light: 180, progress: '子实体生长', expect: at(4, '06:00') },
      { id: 'FR-261115-04', batch: 'MJ-261115-04', room: 'GF-04', flush: 2, tempDiff: 9, hum: 87, co2: 700, light: 220, progress: '催蕾', expect: at(8, '06:00') },
      { id: 'FR-261115-05', batch: 'MJ-261115-05', room: 'GF-05', flush: 2, tempDiff: 8, hum: 89, co2: 640, light: 260, progress: '菇蕾分化', expect: at(5, '06:00') },
      { id: 'FR-261115-06', batch: 'MJ-261115-06', room: 'GF-06', flush: 2, tempDiff: 6, hum: 91, co2: 580, light: 300, progress: '子实体生长', expect: at(3, '06:00') }
    ],
    harvest: [
      { id: 'HV-261116-01', batch: 'MJ-261115-01', room: 'GF-01', flush: 2, kg: 320, grade1: 264, workers: 4, hours: 3.5, operator: '惠加宁', time: at(0, '06:20') },
      { id: 'HV-261116-02', batch: 'MJ-261115-02', room: 'GF-02', flush: 2, kg: 286, grade1: 236, workers: 4, hours: 3.2, operator: '惠加宁', time: at(0, '06:40') },
      { id: 'HV-261116-03', batch: 'MJ-261112-07', room: 'GF-03', flush: 1, kg: 240, grade1: 198, workers: 3, hours: 3.0, operator: '徐水应', time: at(0, '07:00') },
      { id: 'HV-261116-04', batch: 'MJ-261115-05', room: 'GF-05', flush: 2, kg: 220, grade1: 181, workers: 3, hours: 2.8, operator: '徐水应', time: at(0, '07:20') },
      { id: 'HV-261116-05', batch: 'MJ-261115-06', room: 'GF-06', flush: 2, kg: 220, grade1: 181, workers: 3, hours: 2.8, operator: '惠加宁', time: at(0, '07:40') },
      { id: 'HV-261115-06', batch: 'MJ-261110-08', room: 'GF-04', flush: 2, kg: 410, grade1: 336, workers: 5, hours: 4.0, operator: '惠加宁', time: at(-1, '06:30') }
    ],
    storage: [
      { id: 'SL-261116-01', zone: 'YL-01', batch: 'MJ-261115-01', variety: '平菇', tons: 1.4, expiry: at(2, '23:59'), temp: 5.6, status: '临期' },
      { id: 'SL-261116-02', zone: 'YL-01', batch: 'MJ-261115-02', variety: '杏鲍菇', tons: 1.8, expiry: at(3, '23:59'), temp: 5.6, status: '临期' },
      { id: 'SL-261115-03', zone: 'LK-A', batch: 'MJ-261110-08', variety: '香菇', tons: 6.8, expiry: at(9, '23:59'), temp: 2.8, status: '正常' },
      { id: 'SL-261115-04', zone: 'LK-B', batch: 'MJ-261112-07', variety: '金针菇', tons: 4.1, expiry: at(7, '23:59'), temp: 3.1, status: '正常' }
    ],
    storageMoves: [
      { id: 'SM-261116-01', type: '入库', zone: 'YL-01', batch: 'MJ-261115-01', tons: 1.4, operator: '陈小忠', time: at(0, '08:10') },
      { id: 'SM-261116-02', type: '入库', zone: 'YL-01', batch: 'MJ-261115-02', tons: 1.8, operator: '陈小忠', time: at(0, '08:20') },
      { id: 'SM-261116-03', type: '出库', zone: 'LK-A', batch: 'MJ-261110-08', tons: 0.6, operator: '廖春亮', time: at(0, '09:30') },
      { id: 'SM-261115-04', type: '入库', zone: 'LK-A', batch: 'MJ-261110-08', tons: 7.4, operator: '陈小忠', time: at(-1, '09:00') },
      { id: 'SM-261115-05', type: '入库', zone: 'LK-B', batch: 'MJ-261112-07', tons: 4.1, operator: '陈小忠', time: at(-1, '10:00') }
    ],
    devices: [
      { id: 'DV-01', name: '1号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '运行', bought: '2023-04-12', control: false },
      { id: 'DV-02', name: '2号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '运行', bought: '2023-04-12', control: false },
      { id: 'DV-03', name: '3号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '故障', bought: '2023-04-12', control: false },
      { id: 'DV-04', name: '4号灭菌锅', type: '灭菌锅', model: 'LSQ-1200', maker: '衡阳压力容器厂', location: 'MJ-W', status: '待机', bought: '2024-02-20', control: false },
      { id: 'DV-05', name: '自动装袋机', type: '装袋机', model: 'ZD-17', maker: '漳州菌机装备', location: 'BD-01', status: '运行', bought: '2023-06-08', control: false },
      { id: 'DV-06', name: '无菌接种机', type: '接种机', model: 'JZ-100', maker: '漳州菌机装备', location: 'JZ-01', status: '运行', bought: '2023-06-08', control: false },
      { id: 'HS-01', name: '1号加湿器', type: '加湿器', model: 'CS-20', maker: '苏州雾联环境', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 90 },
      { id: 'HS-02', name: '2号加湿器', type: '加湿器', model: 'CS-20', maker: '苏州雾联环境', location: 'GF-03', status: '离线', bought: '2023-08-15', control: true, setpoint: 92 },
      { id: 'HS-03', name: '3号加湿器', type: '加湿器', model: 'CS-20', maker: '苏州雾联环境', location: 'GF-05', status: '运行', bought: '2023-08-15', control: true, setpoint: 90 },
      { id: 'XF-01', name: 'GF-01 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-01', status: '运行', bought: '2023-08-15', control: true, setpoint: 800 },
      { id: 'XF-02', name: 'GF-02 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-02', status: '联动', bought: '2023-08-15', control: true, setpoint: 800 },
      { id: 'XF-04', name: 'GF-04 新风风机', type: '新风风机', model: 'XF-380', maker: '德州通风设备', location: 'GF-04', status: '运行', bought: '2023-08-15', control: true, setpoint: 800 },
      { id: 'LS-01', name: '冷水机组', type: '冷水机组', model: 'LS-60', maker: '烟台制冷股份', location: 'LK-A', status: '运行', bought: '2023-05-30', control: true, setpoint: 3 },
      { id: 'XH-05', name: 'GF-05 层架循环风机', type: '循环风机', model: 'XH-120', maker: '德州通风设备', location: 'GF-05', status: '定时', bought: '2024-03-11', control: true, setpoint: 15 },
      { id: 'ZM-02', name: 'GF-02 照明灯组', type: '照明灯组', model: 'LED-200', maker: '中山菌光照明', location: 'GF-02', status: '运行', bought: '2023-08-15', control: true, setpoint: 300 },
      { id: 'SN-C02', name: 'GF-02 CO₂传感器', type: 'CO₂传感器', model: 'CO2-NDIR', maker: '汉威传感', location: 'GF-02', status: '运行', bought: '2024-05-06', control: false },
      { id: 'SN-T01', name: 'GF-01 温湿度传感器', type: '温湿度传感器', model: 'TH-485', maker: '汉威传感', location: 'GF-01', status: '运行', bought: '2024-05-06', control: false },
      { id: 'SN-T04', name: '预冷区温湿度传感器', type: '温湿度传感器', model: 'TH-485', maker: '汉威传感', location: 'YL-01', status: '运行', bought: '2024-05-06', control: false }
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
      { id: 'WO-261116-01', device: 'DV-03', type: '维修', item: '灭菌锅密封圈更换并复判曲线', status: '待处理', owner: '张才孙', parts: 'SP-02', time: at(0, '08:20') },
      { id: 'WO-261116-02', device: 'HS-02', type: '维修', item: '加湿器离线检修（电源/雾化片）', status: '处理中', owner: '张才孙', parts: '—', time: at(-1, '22:20') },
      { id: 'WO-261115-03', device: 'DV-01', type: '保养', item: '季度保养完成，安全阀校验合格', status: '已完成', owner: '张才孙', parts: 'SP-02', time: at(-3, '15:00') },
      { id: 'WO-261115-04', device: 'XH-05', type: '保养', item: '循环风机轴承加注润滑脂', status: '已完成', owner: '朱泉龙', parts: '—', time: at(-4, '10:00') }
    ],
    spares: [
      { id: 'SP-01', name: 'HEPA 过滤器', spec: 'H14 610×610', unit: '只', stock: 6, safety: 4, location: '备件库 A-01' },
      { id: 'SP-02', name: '灭菌锅密封圈', spec: 'LSQ-1200 硅胶', unit: '条', stock: 12, safety: 10, location: '备件库 A-02' },
      { id: 'SP-03', name: '电磁阀', spec: 'DN25 蒸汽', unit: '只', stock: 3, safety: 4, location: '备件库 B-01' },
      { id: 'SP-04', name: 'CO₂传感器', spec: 'CO2-NDIR', unit: '只', stock: 5, safety: 3, location: '备件库 B-02' },
      { id: 'SP-05', name: '装袋机皮带', spec: 'ZD-17 同步带', unit: '条', stock: 8, safety: 6, location: '备件库 A-03' }
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
      { id: 'EN-09', field: '联系电话', value: '0731-8888 6666' }
    ],
    certs: [
      { id: 'CT-01', name: '食品生产许可证（SC）', no: 'SC11643012200886', expire: at(400, '00:00'), status: '有效' },
      { id: 'CT-02', name: 'ISO22000 食品安全体系', no: 'CN23/FSM-0412', expire: at(25, '00:00'), status: '即将到期' },
      { id: 'CT-03', name: '绿色食品认证', no: 'LB-43-2601180088A', expire: at(180, '00:00'), status: '有效' },
      { id: 'CT-04', name: 'GAP 良好农业规范', no: 'GAP-CN-2023-117', expire: at(-10, '00:00'), status: '已过期' }
    ],
    rules: [
      { id: 'AR-01', metric: 'CO₂ 浓度', scope: '全部出菇房', op: '>', threshold: 800, unit: 'ppm', level: 'urgent', channel: '站内+短信', enabled: true },
      { id: 'AR-02', metric: '温度区间', scope: '分品种配方', op: '超出', threshold: '±2', unit: '°C', level: 'important', channel: '站内', enabled: true },
      { id: 'AR-03', metric: '相对湿度', scope: '全部出菇房', op: '<', threshold: 85, unit: '%', level: 'reminder', channel: '站内', enabled: true },
      { id: 'AR-04', metric: '污染率', scope: '培养车间', op: '≥', threshold: 3.0, unit: '%', level: 'important', channel: '站内+短信', enabled: true },
      { id: 'AR-05', metric: '设备离线时长', scope: '全部设备', op: '≥', threshold: 30, unit: 'min', level: 'important', channel: '站内', enabled: true },
      { id: 'AR-06', metric: '层间温差', scope: '层架菇房', op: '>', threshold: 1.5, unit: '°C', level: 'reminder', channel: '站内', enabled: false },
      { id: 'AR-07', metric: '预冷区温度', scope: 'YL-01', op: '>', threshold: 4, unit: '°C', level: 'important', channel: '站内+短信', enabled: true }
    ],
    traceCodes: [
      { id: 'TR-261115-01001', batch: 'MJ-261115-01', level: '箱码', status: '已绑定', printed: true, time: at(0, '08:12') },
      { id: 'TR-261115-01002', batch: 'MJ-261115-01', level: '箱码', status: '已绑定', printed: true, time: at(0, '08:12') },
      { id: 'TR-261115-02001', batch: 'MJ-261115-02', level: '箱码', status: '已激活', printed: true, time: at(0, '08:25') },
      { id: 'TR-261112-07001', batch: 'MJ-261112-07', level: '批码', status: '已绑定', printed: true, time: at(-2, '09:00') },
      { id: 'TR-261110-08001', batch: 'MJ-261110-08', level: '批码', status: '已绑定', printed: true, time: at(-6, '09:00') },
      { id: 'TR-261116-01001', batch: 'MJ-261116-01', level: '批码', status: '已生成', printed: false, time: at(0, '06:40') },
      { id: 'TR-261116-02001', batch: 'MJ-261116-02', level: '批码', status: '已生成', printed: false, time: at(0, '07:10') }
    ],
    printTasks: [
      { id: 'PT-261116-01', batch: 'MJ-261115-01', count: 120, status: '已完成', operator: '陈小忠', time: at(0, '08:15') },
      { id: 'PT-261116-02', batch: 'MJ-261115-02', count: 100, status: '打印中', operator: '陈小忠', time: at(0, '08:30') }
    ],
    chain: [
      { batch: 'MJ-261115-01', nodes: { strain: { time: at(-26, '08:00'), operator: '周明轩', params: 'EG-01 栽培种 15g/袋' }, bag: { time: at(-26, '10:00'), operator: '黄忠坚', params: 'PB 配方 含水率62%' }, sterilize: { time: at(-25, '04:00'), operator: '张才孙', params: '121°C 120min' }, inoculate: { time: at(-24, '09:00'), operator: '周明轩', params: 'JZ-01 沉降菌0.9' }, culture: { time: at(-24, '14:00'), operator: '徐水应', params: 'PY-01-A01 24天' }, fruit: { time: at(-8, '06:00'), operator: '惠加宁', params: 'GF-01 第2潮' }, harvest: { time: at(0, '06:20'), operator: '惠加宁', params: '320kg 一级264kg' }, grade: { time: at(0, '08:00'), operator: '陈小忠', params: '一级/二级/加工级' }, cold: { time: at(0, '08:10'), operator: '陈小忠', params: 'YL-01 1.4t' } } },
      { batch: 'MJ-261115-02', nodes: { strain: { time: at(-26, '08:00'), operator: '周明轩', params: 'EG-02 栽培种' }, bag: { time: at(-26, '10:00'), operator: '黄忠坚', params: '含水率63%' }, sterilize: { time: at(-25, '04:00'), operator: '张才孙', params: '121°C 120min' }, inoculate: { time: at(-24, '09:00'), operator: '周明轩', params: 'JZ-01' }, culture: { time: at(-24, '14:00'), operator: '徐水应', params: 'PY-01-A02 24天' }, fruit: { time: at(-8, '06:00'), operator: '惠加宁', params: 'GF-02 第2潮' }, harvest: { time: at(0, '06:40'), operator: '惠加宁', params: '286kg' }, grade: { time: at(0, '08:00'), operator: '陈小忠', params: '分级完成' }, cold: { time: at(0, '08:20'), operator: '陈小忠', params: 'YL-01 1.8t' } } },
      { batch: 'MJ-261115-03', nodes: { strain: { time: at(-2, '06:00'), operator: '周明轩', params: 'EG-03' }, bag: { time: at(-2, '08:00'), operator: '陈小忠', params: '玉米芯配方' }, sterilize: { time: at(0, '02:10'), operator: '朱泉龙', params: '曲线缺口 待复判' }, inoculate: null, culture: null, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261115-04', nodes: { strain: { time: at(-18, '08:00'), operator: '周明轩', params: 'EG-04' }, bag: { time: at(-18, '10:00'), operator: '黄忠坚', params: '木屑配方' }, sterilize: { time: at(-17, '04:00'), operator: '张才孙', params: '121°C 120min' }, inoculate: { time: at(-16, '09:00'), operator: '廖春亮', params: 'JZ-01' }, culture: { time: at(-16, '14:00'), operator: '徐水应', params: 'PY-01-A03 18天 污染2.8%' }, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261116-01', nodes: { strain: { time: at(0, '06:00'), operator: '周明轩', params: 'EG-01' }, bag: { time: at(0, '06:30'), operator: '黄忠坚', params: 'PB-261116-01 4000袋' }, sterilize: null, inoculate: null, culture: null, fruit: null, harvest: null, grade: null, cold: null } },
      { batch: 'MJ-261110-08', nodes: { strain: { time: at(-36, '08:00'), operator: '周明轩', params: 'EG-04' }, bag: { time: at(-36, '10:00'), operator: '黄忠坚', params: '木屑配方' }, sterilize: { time: at(-35, '04:00'), operator: '张才孙', params: '121°C 120min' }, inoculate: { time: at(-34, '09:00'), operator: '周明轩', params: 'JZ-01' }, culture: { time: at(-34, '14:00'), operator: '徐水应', params: '26天' }, fruit: { time: at(-14, '06:00'), operator: '惠加宁', params: 'GF-04 第2潮' }, harvest: { time: at(-1, '06:30'), operator: '惠加宁', params: '410kg' }, grade: { time: at(-1, '08:00'), operator: '陈小忠', params: '一级336kg' }, cold: { time: at(-1, '09:00'), operator: '陈小忠', params: 'LK-A 7.4t' } } }
    ],
    blockchain: [
      { id: 'BC-261116-01', batch: 'MJ-261115-01', node: '采收', hash: '0x8f3a…c21d', height: 1842261, tx: '0x51b9…08aa', time: at(0, '06:25'), status: '成功' },
      { id: 'BC-261116-02', batch: 'MJ-261115-01', node: '冷链', hash: '0x2c77…9e04', height: 1842290, tx: '0x90d2…71bc', time: at(0, '08:12'), status: '成功' },
      { id: 'BC-261116-03', batch: 'MJ-261115-02', node: '采收', hash: '0x41be…77f0', height: 1842263, tx: '0x33a8…c9d1', time: at(0, '06:45'), status: '成功' },
      { id: 'BC-261115-04', batch: 'MJ-261110-08', node: '冷链', hash: '0x6d02…b315', height: 1841902, tx: '0x77c1…2e08', time: at(-1, '09:05'), status: '成功' },
      { id: 'BC-261115-05', batch: 'MJ-261112-07', node: '分级', hash: '0x9a44…10cf', height: 1841877, tx: '0x12f6…8b3e', time: at(-1, '08:20'), status: '成功' },
      { id: 'BC-261115-06', batch: 'MJ-261115-03', node: '灭菌', hash: '0x0e58…d4a9', height: 0, tx: '—', time: at(0, '02:20'), status: '失败' }
    ],
    recalls: [
      { id: 'RC-261116-01', batch: 'MJ-261110-08', scope: 'TR-261110-08001 起 60 箱', level: '二级', status: '通知中', recovery: 42.5, operator: '周明轩', time: at(0, '10:00') },
      { id: 'RC-261110-02', batch: 'MJ-261108-05', scope: '演练批次 120 箱', level: '三级', status: '已完成', recovery: 98.6, operator: '周明轩', time: at(-8, '09:00') }
    ],
    regulatory: [
      { id: 'RP-261116-01', type: '批次报文', batch: 'MJ-261116-01', count: 1, status: '成功', receipt: '湘监收〔2026〕1116-01', time: at(0, '07:00') },
      { id: 'RP-261116-02', type: '采收报文', batch: 'MJ-261115-01', count: 5, status: '成功', receipt: '湘监收〔2026〕1116-02', time: at(0, '08:30') },
      { id: 'RP-261115-03', type: '批次报文', batch: 'MJ-261115-03', count: 2, status: '死信', receipt: '—', time: at(-1, '10:20') },
      { id: 'RP-261115-04', type: '冷链报文', batch: 'MJ-261110-08', count: 3, status: '成功', receipt: '湘监收〔2026〕1115-04', time: at(-1, '09:10') }
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
    'GF-01': { temp: 18.2, hum: 88, co2: 620, light: 260 },
    'GF-02': { temp: 16.8, hum: 90, co2: 986, light: 300 },
    'GF-03': { temp: 12.5, hum: 92, co2: 540, light: 180 },
    'GF-04': { temp: 15.6, hum: 87, co2: 700, light: 220 },
    'GF-05': { temp: 18.6, hum: 89, co2: 640, light: 260 },
    'GF-06': { temp: 16.2, hum: 91, co2: 580, light: 300 },
    'PY-01': { temp: 23.4, hum: 65, co2: 1200, light: 0 },
    'YL-01': { temp: 5.6, hum: 90, co2: 0, light: 0 },
    'LK-A': { temp: 2.8, hum: 88, co2: 0, light: 0 },
    'LK-B': { temp: 3.1, hum: 87, co2: 0, light: 0 }
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
          light: base.light ? Math.round(base.light * (d.getHours() >= 6 && d.getHours() <= 18 ? 1 : 0.15)) : 0
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
    at: at
  };
  global.FungiStore = api;
})(window);