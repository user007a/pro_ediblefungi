/* ============================================================
 * 门户元信息 · 统一登录入口
 * 只描述"系统"：准入方式 / 功能 / 服务状态 / 版本
 * 生产实时数据归属各端，门户不承载
 * ============================================================ */
(function (global) {
  'use strict';

  global.PortalData = {
    meta: {
      factory: '托克逊县食用菌工厂',
      platform: '工厂化农业数据管理平台',
      project: '托克逊县 2026 年科技兴农项目',
      code: 'TXS-2026-KJXN-07',
      version: 'v2.3.0',
      updated: '2026-11-12',
      scale: '7 道工序 · 12 间菇房 · 4 类分项能耗',
      scenes: [
        { img: 'applefarm_h5/images/trace_sterilize.jpg', cap: '接种室 · 场景示意', alt: '洁净工作台前的接种作业场景' },
        { img: 'applefarm_h5/images/trace_incubate.jpg', cap: '培养房 · 场景示意', alt: '培养房内多层菌棒架与长满菌丝的菌棒' },
        { img: 'applefarm_h5/images/trace_fruiting.jpg', cap: '出菇房 · 场景示意', alt: '出菇房内多层菇架与采收作业场景' },
        { img: 'applefarm_h5/images/trace_coldchain.jpg', cap: '冷库 · 场景示意', alt: '冷库内装箱菌菇与盘点作业场景' }
      ]
    },
    systems: [
      {
        id: 'admin', name: '管理后台', group: 'auth',
        href: 'applefarm_backhand/login.html',
        version: 'v2.3.0', state: 'ok',
        role: '厂部管理 · 生产统计 · 信息员',
        method: '员工账号 · 按角色授权',
        features: ['生产计划与七道工序台账', '菇房环境配方与设备联控', '批次追溯赋码与检测报告'],
        demo: { u: 'admin', p: 'admin123' }
      },
      {
        id: 'mobile', name: '移动应用端', group: 'auth',
        href: 'applefarm_mobile/mb_login.html',
        version: 'v2.3.0', state: 'ok',
        role: '车间巡检 · 设备处置 · 现场报工',
        method: '作业人员账号 / 微信快捷登录',
        features: ['环境曲线与告警处置', '设备远程控制与点检', '扫码报工 · 离线缓存补传'],
        demo: { u: 'demo', p: 'demo123' },
        qr: true
      },
      {
        id: 'screen', name: '生产数据大屏', group: 'open',
        href: 'applefarm_dataanlye/da_index.html?view=overview',
        version: 'v2.2.4', state: 'ok',
        role: '值班室统览 · 参观接待',
        method: '免登录 · 建议 1920×1080 全屏',
        views: ['3D 厂区鸟瞰', '环境与设备', '视频监控', '生产进度', '分项能耗', '质量追溯']
      },
      {
        id: 'trace', name: '消费者溯源 H5', group: 'open',
        href: 'applefarm_h5/trace_h5.html',
        version: 'v2.3.0', state: 'ok',
        role: '消费者核验 · 监管抽查',
        method: '免登录 · 扫包装追溯码即查',
        features: ['批次履历与产地信息', '出厂检测报告', '链上存证与扫码风控'],
        qr: true
      }
    ]
  };
})(window);