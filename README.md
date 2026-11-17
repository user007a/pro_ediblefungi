# 食用菌工厂化农业数据管理平台（HTML 原型）

> 交接说明 · 最后更新：2026-11-16
> 后续接手的 Agent（WorkBuddy / Qcoder 等）请先读完本文件，再读 `docs/需求说明书.md`，然后开始改页面。

---

## 0. 接手前必读

1. **需求基准**：`docs/需求说明书.md`（页面清单、字段、流程以它为准）。
2. **视觉基准**：双面品牌 v2.1（见第 3 节）——工厂移动端 = 中性画布 + 品牌棕点缀（`css/mobile-design-system.css`）；消费者追溯 `html/applefarm_h5/trace_h5.html` 保留全棕暖调，两面不混用。
3. **本轮改造范围**：移动端 `html/applefarm_mobile/` 的登录、首页、监测、监控及首页九个业务入口。
4. **还没改完**：PC 后台菜单外遗留页（约 110 个）、数据大屏仍是苹果/果园口径（见第 8 节）；移动端 15 页与 PC 后台登录/主框架/首页 + 28 个菜单页已完成菌菇化。

---

## 1. 项目形态

- 纯前端 HTML 原型，无后端、无构建步骤；数据用 `localStorage` / `sessionStorage` 模拟。
- 四端一体：
  - `html/applefarm_backhand/`：PC 管理后台
  - `html/applefarm_mobile/`：移动端（车间现场作业）
  - `html/applefarm_dataanlye/`：数据大屏
  - `html/applefarm_h5/`：消费者扫码追溯 H5
- 统一入口：`index.html` → `html/portal.html`（**统一登录聚合页**，见 4.4；只做入口聚合与系统服务状态，不展示生产实时数据）。


## 2. 目录速览

| 路径 | 说明 |
|---|---|
| `docs/需求说明书.md` | 需求基准（改页面前必读） |
| `html/applefarm_mobile/` | 移动端 15 个菌菇页面、`css/mobile-design-system.css`、`js/mobile-store.js`、`js/mobile-messages.js`；苹果时期无关页面已删除（见 8） |
| `html/applefarm_h5/` | 追溯 H5；`images/trace_*.jpg` 是移动端改版公用图片素材 |
| `html/applefarm_backhand/` | PC 后台：登录/主框架/首页 + 28 个菜单页已菌菇化（见 8）；菜单外遗留页仍是苹果口径 |
| `html/applefarm_dataanlye/` | 数据大屏：仅 `da_index.html`（6 视图同文件切换），配 `assets/campus_night.jpg` + `assets/cams/01~09.jpg` |
| `html/portal.html` | 统一登录聚合门户（入口矩阵 + 系统服务状态，见 4.4） |
| `html/common/js/portal_data.js` | 门户系统元数据（四端入口/服务状态/演示账号/场景轮播），不含生产数据与版本号 |
| `html/common/js/qrcode.js` | vendored MIT qrcode-generator@1.4.4，门户二维码离线生成 |
| `html/common/images/` | 通用图片（多为苹果口径，移动端已不再使用） |

---

## 3. 统一视觉规范（必须遵守）

**双面品牌 v2.1**（2026-11-16 定稿）：

- **工厂面（移动端 15 页）**：中性画布 + 品牌棕点缀。画布 `#FAF9F7` 近白暖灰、卡片纯白、正文中性暖灰；棕色只出现在头部渐变、主按钮、选中态；状态色用惯例绿/琥珀/红/蓝（可读性优先，不把状态染棕）。
- **消费者面（追溯 H5）**：保留全棕暖调（菌菇意象），不随工厂面改动。

品牌棕阶、语义色、阴影、头部渐变已在 `css/mobile-design-system.css`（v2.1）源头定义；移动端各页只在 `<style>` 顶部放同一份画布/文字覆盖：

```html
<link rel="stylesheet" href="css/mobile-design-system.css">
<style>
  /* ===== 菌菇工厂主题 v2.1：中性画布 + 品牌棕点缀（头部/主按钮/选中态）；
     状态色用设计系统惯例绿/琥珀/红/蓝，全棕暖调仅消费者追溯 H5 使用 ===== */
  :root {
    --bg: #FAF9F7;
    --text: #26221E;
    --text-secondary: #55504A;
    --text-tertiary: #7A7268;
    --border: #E6E1D8;
    --border-light: #F0EDE7;
    --shadow-card: 0 2px 12px rgba(69, 48, 35, 0.08);
  }
  body { background: var(--bg); }
</style>
```

要点：

- 字体沿用 `--font-family`（设计系统统一），不要另设字体；数字读数用等宽数字（设计系统以 `:where(...)` 覆盖各页数字类名的 `font-variant-numeric: tabular-nums`，**新增数字类名要补进该清单**）。
- 棕色仅用于头部渐变（`--gradient-header`）、主按钮（`--gradient-primary`）、选中态；正文、描边、状态标签不用棕。
- 语义色：绿(`--success`) / 琥珀(`--warning`) / 红(`--error`) / 蓝(`--info`)，浅底用对应 `*-light`；预警橙级可用橙色浅底（如 `#FBEADB/#B4611F`）。
- 常用组件：`mb-app`、`mb-section`、`mb-section-title`、`mb-back-bar`、`mb-modal-overlay` + `mb-modal.is-sheet`、`mb-btn`、`mb-tag`、`mb-quick-icon`、`mb-skeleton`。
- 主 Tab 页（首页/监测/监控/我的）使用 4 项 `mb-tab-bar`；**子页面只用 `mb-back-bar` 返回，不加底部 Tab**。
- **禁止引入 CDN**（pannellum、font-awesome 等已移除），必须离线可用。
- 移动端图片素材统一用 `../applefarm_h5/images/trace_*.jpg` / `mushroom_pack.jpg`。

---

## 4. 本轮已完成改造

### 4.1 框架页

| 文件 | 页面 | 已实现内容 |
|---|---|---|
| `applefarm_mobile/mb_login.html` | 登录 | 系统名「食用菌移动助手」（标题/系统名/微信授权弹窗/协议文本统一）、菌菇主题、菇房背景、食用菌文案、协议/隐私政策改写、演示账号角色改为车间操作工；无记住凭据时自动预填演示账号 `demo / demo123`（与页面提示一致，记住密码回填优先） |
| `applefarm_mobile/mb_home.html` | 车间工作台 | 问候区（姓名/岗位/工号/菇房/日期）、今日待办 2 项（抽屉：建议/执行/采纳/关闭）置于环境卡之前、当前菇房环境紧凑状态条（适宜度+四指标一行，点击展开详情；有 GF-01 未处置预警时显示异常横幅并自动置顶，处置后恢复适宜态，与预警台账互通）、常用服务按登录角色显示高频入口（操作工/运维/质检/仓储，管理员与访客显示全部，「全部」Tile 展开九宫格；统一排序见第 5 节 SVC_ORDER）、今日动态三联卡、离线同步条、铃铛与「我的」角标跟随消息未读数 |
| `applefarm_mobile/mb_device.html` | 监测 Tab | 菇房选择、适宜性评估、温度/湿度/CO₂/光照、SVG 曲线（1min/1h/1d）、越限记录、6 台设备控制（启停二次确认、阈值步进、自动/手动、报修） |
| `applefarm_mobile/vr_panorama.html` | 监控 Tab | 整页重写为视频监控：8 路通道（在线/告警/离线）、2×2/3×3、全屏模拟预览、回放时间轴与倍速、AI 抓拍列表 |

### 4.2 首页九个业务入口

| 入口 | 文件 | 核心业务逻辑 | 存储键 |
|---|---|---|---|
| 扫码开工 | `mb_label.html` | 批次码格式校验、重复开工拦截、批次卡、工序选择、开工登记、带参跳转工序填报；键缺失或为空时种子 4 条开工记录（批次避开样例码，不拦截样例扫码） | `mushroom_scan_jobs` |
| 工序填报 | `mb_record_task.html` | 拌料/灭菌/接种/培养/出菇/采收 6 类台账、字段级校验、照片凭证、待同步重试；键缺失或为空时种子 8 条台账（拌料×3/接种×2/培养×1/出菇×1/采收×1，批次与扫码开工互相呼应，默认拌料 Tab 显示 3 条） | `mushroom_process_records` |
| 采收过磅 | `mb_yield.html` | 批次联动、总重/一级/二级校验、等外重与一级率自动计算、二次确认、CS 单号、今日汇总；键缺失或为空时种子 6 条磅单（今日 3 + 昨日 3，今日合计 1156.9kg / 一级率 82.1%）；批次字典补 `JB-20261112-02`（杏鲍菇 GF-02）与 `JB-20261110-05`（白玉菇 GF-05） | `mushroom_harvest_records` |
| 质量抽检 | `mb_patrol.html` | 抽样数/均重/直径校验、色泽/形态/气味/杂质判定、结论自动生成、不合格强制处置、ZJ 单号；键缺失或为空时种子 6 条抽检单（今日 3 含 1 条形态不合格带处置措施，历史含 1 条色泽+气味不合格降级处置）；批次字典与采收过磅一致，今日批次与磅单对应（采后抽检） | `mushroom_quality_records` |
| 预警处置 | `mb_alert.html` | 蓝/黄/橙/红四级预警、状态与级别筛选、处置措施+结果回填、已处置留痕、可转维修工单 | `mushroom_alert_records` |
| 杂菌识别 | `mb_disease.html` | 样例图片上传、扫描动画、绿霉识别结果（置信度/风险）、4 条处置建议、一键污染上报；识别历史键缺失或为空时种子 4 条（高/中/中/低风险，复用样例图片与批次） | `mushroom_contamination_reports`、`mushroom_disease_history` |
| 设备控制 | `mb_device.html` | 见 4.1，设备列表与详情抽屉 | — |
| 设备报修 | `mb_troubleshoot.html` | 设备+回路号、故障描述、紧急程度、手机号校验、WX 工单、受理/完成流转；键缺失或为空时种子 6 条工单（待受理 1/维修中 2/今日完成 1/昨日完成 1/前日完成 1，统计 1/2/1） | `mushroom_repair_orders` |
| 冷库出入库 | `mb_material.html` | 温区/库位、追溯码段自动生成、入库/出库校验、库存扣减、温度越限阻断出库、RK/CK 流水 | `mushroom_cold_storage`、`mushroom_cold_logs` |

> 所有提交动作在离线时通过 `MobileStore.enqueue()` 入队并标记「待同步」，页面内提供「重试同步」。
> 追溯 H5：`applefarm_h5/trace_h5.html`、`h5_trace_detail.html` 已于更早一轮完成菌菇化，是本轮主题参照，本轮未再改动。

### 4.3 消息通知与个人中心

| 文件 | 页面 | 已实现内容 |
|---|---|---|
| `applefarm_mobile/js/mobile-messages.js` | 共享消息数据层 | 聚合预警/维修工单/扫码任务/系统公告四类消息（不另造消息存储），已读标记 `mushroom_msg_read`、系统公告 `mushroom_sys_messages`；`disposeAlert()` 与 `mb_alert.html` 提交语义完全一致（含转报修生成 WX 工单） |
| `applefarm_mobile/mb_news.html` | 消息通知中心 | 预警/设备故障/任务/系统 4 Tab + 分类未读角标、全部/未读筛选、全部已读；预警卡片底部抽屉直接提交处置反馈（措施+结果，转报修需备注），其余类别跳详情页 |
| `applefarm_mobile/mb_news_detail.html` | 消息详情 | 按类别展示预警留痕/工单信息/开工信息/公告正文，上下文按钮（去处置、查看工单、去填报工序） |
| `applefarm_mobile/mb_mine.html` | 我的 Tab | 姓名/岗位取自登录会话、作业统计（今日/累计上报、扫码开工、待同步）联动真实存储；消息通知（未读角标）、作业记录（全部+6 工序 Tab、参数详情、照片）、采收记录、报修工单、个人信息（只读资料+修改密码校验）、设置（通知开关 `mushroom_notify_prefs`、立即同步、清除缓存仅清已读/偏好不删台账、关于/协议/版本 v3.1.0）、退出登录二次确认 |

- 首页铃铛 → `mb_news.html`，红点与「我的」Tab 角标均由 `MobileMessages.unreadCount()` 驱动（无未读时隐藏）。
- 预警种子数据与 `mb_alert.html` 使用相同 `AL-YYYYMMDD-NN` 编号，两页处置状态互通，不会重复生成。

### 4.4 门户（统一登录聚合页）

`html/portal.html` 于 2026-11-16 重写为**登录聚合页**，不再承担实时数据看板职能：

- 结构：左侧品牌区（厂名锁定式双行标题、**四张工厂场景轮播**：接种→培养→出菇→冷库，6s 自动播放、悬停/聚焦暂停、可暂停按钮、箭头/圆点/滑动/方向键切换、底部进度条；图片与说明在 `portal_data.js meta.scenes`）+ 项目编号/覆盖规模、四端服务状态清单（只报"正常/维护"，**不显示版本号**，用户要求）；右侧入口矩阵，分两组：**壹 需登录·厂内员工**（管理后台、移动应用端）与**贰 免登录·直开**（生产数据大屏、消费者溯源 H5）。
- 每张入口卡只陈述"登录契约"：适用角色、进入方式、3 项核心功能、演示账号（带复制按钮）、进入 CTA；**不含任何生产实时指标**（KPI/告警/菇房曲线/工序照片条已全部删除）。
- **页面不写解释性文案**（用户要求）：无"继续上次"条、无分组旁注/组下注、无卡片服务更新日期、无政策声明行、无品牌导语——用户进来直接看入口判断。`localStorage.portal_last_sys` 仍记录最近进入的系统，但只驱动卡上"常用"徽标；移动登录与溯源示例附**真实可扫二维码**（`common/js/qrcode.js` 离线生成 SVG；`file://` 预览时二维码说明自动降级为"本地预览 · 部署后扫码生效"）。
- 复制按钮失败时有可见反馈（选中账号文本提示 Ctrl+C），不会静默失败。
- 门户**不设统一登录表单、不收集/存储密码**；认证在各端登录页完成。
- 系统状态口径是"服务是否正常"（仅左栏清单），不是生产状态；**顶栏状态胶囊与"管理登录"快捷按钮已按用户要求移除**，顶栏右侧只留右对齐的时间/日期时钟；**入口页任何位置不显示版本号**（卡片状态章、清单、左栏、页脚的版本均已按用户要求移除）；实时数据进对应系统查看。
- 视觉沿用松绿 + 琥珀台账语言与工程网格底纹；390/760/1080/1440 四档实测无横向溢出。

---

## 5. 移动端导航与入口约定

- 底部 4 个主 Tab：**首页** `mb_home.html` / **监测** `mb_device.html` / **监控** `vr_panorama.html` / **我的** `mb_mine.html`。
- 首页常用服务（只放“动作型入口”，按登录角色显示高频 4 项 + 「全部」展开完整九宫格；管理员/访客显示全部）：
- **统一排序（`SVC_ORDER`，角色高频子集与展开九宫格均按此序）**：设备控制 → 设备报修 → 预警处置 → 扫码开工 → 工序填报 → 采收过磅 → 冷库出入库 → 质量抽检 → 杂菌识别（2026-11-16 按用户指定调整）。

| 分组 | 入口 → 页面 |
|---|---|
| 现场作业 | 扫码开工 → `mb_label.html`；工序填报 → `mb_record_task.html`；采收过磅 → `mb_yield.html` |
| 质量与处置 | 质量抽检 → `mb_patrol.html`；预警处置 → `mb_alert.html`；杂菌识别 → `mb_disease.html` |
| 设备与仓储 | 设备控制 → `mb_device.html`；设备报修 → `mb_troubleshoot.html`；冷库出入库 → `mb_material.html` |

- 子页面统一 `mb-back-bar` 返回 `mb_home.html`。
- 首页铃铛 → `mb_news.html`（消息通知中心）；「我的」Tab → `mb_mine.html`。

---

## 6. 关键产品决策（不要回退）

1. **追溯不放在移动端**：批次追溯只在 PC 后台「追溯管理」与消费者 H5 中出现；移动端不设追溯入口，操作工扫码开工只展示当前批次基本信息。
2. **移动端是现场作业终端**，不是缩小版后台：常用服务只放高频动作，环境/曲线/视频/消息交给 Tab 和铃铛。
3. **主 Tab 固定 4 项**，不再出现「服务 / 地块 / AI」等旧 Tab。
4. **演示账号**：`demo / demo123`（访客）、`zhangjianguo / 123456`（车间操作工）、`admin / admin123`（管理员）。
5. **登录会话**：登录页写入 `sessionStorage.loginUser`、`sessionStorage.loginRole`；各业务页操作人默认取 `loginUser`，缺省「李国强」。
6. **本期范围外**：认养、商城、销售、价格、模型、生长监测等苹果时期功能不做；对应移动端页面已于清理轮删除（见第 8 节），不要恢复。
7. **本地数据仅用于原型演示**，未与 PC 后台存储打通；不要假装已联调。
8. **门户只做登录聚合**：不在门户展示生产实时数据/告警/环境曲线（用户明确要求）；想看实时动态进对应系统。门户不收集密码，认证留在各端。
9. **双面品牌 v2.1**：工厂移动端 = 中性画布 + 品牌棕点缀 + 惯例语义色；消费者追溯 H5 = 全棕暖调（用户明确「追溯的不动」）。不要把工厂面回退成整页米棕，也不要把追溯 H5 改中性。

---

## 7. 通用数据约定

- 存储统一用 `localStorage`，键名前缀 `mushroom_`；离线队列沿用 `MobileStore` 既有键。
- **跨端契约键名（勿改名）**：`smartorchard_sync_queue`（PC `js/shared/mobile-ops-store.js` 按此名读队列）、`smartorchard_current_user`（登录页写入，H5 `js/h5-auth.js` 与 PC `js/shared/mobile-ops-store.js` 读取）。历史命名保留仅为兼容读取方。
- `js/mobile-store.js` 已清理苹果时期死 API（farming/patrol/plots/material/label/adoption/serviceAction 键与 geolocate/track/GEO_BASE），仅保留队列 + 通用共享列表读写 + 同步条/toast/时间格式化。
- 单据号规则：
  - 采收 `CS-YYYYMMDD-NN`
  - 质量抽检 `ZJ-YYYYMMDD-NN`
  - 设备维修 `WX-YYYYMMDD-NN`
  - 污染上报 `WR-YYYYMMDD-NN`
  - 冷库入库 `RK-YYYYMMDD-NN` / 出库 `CK-YYYYMMDD-NN`
- 状态字段统一为字符串：`submitted` / `pending`（离线）/ `pending`(工单待受理) / `repairing` / `done`，跨页复用时注意语义。
- 菌包批次号格式：`JB-YYYYMMDD-NN`；追溯码段：`SNJG-YYYYMMDD-0001 ~ 0XXX`。

---

## 8. 未完成清单（下一任从这里继续）

### 移动端（已完成清理，仅保留 15 个菌菇页面）

- 框架与 Tab：`mb_login` / `mb_home` / `mb_device` / `vr_panorama` / `mb_mine`；消息：`mb_news` / `mb_news_detail`；九个业务入口：`mb_label` / `mb_record_task` / `mb_yield` / `mb_patrol` / `mb_alert` / `mb_disease` / `mb_troubleshoot` / `mb_material`（设备控制复用 `mb_device`）。
- **已删除 20 个苹果时期无关页面**（经确认）：认养 7 页 `mb_adoption*.html`、`mb_price`、`mb_plan`、`mb_plot`、`mb_draw_plot`、`mb_drone_patrol`、`mb_weather_predict`、`mb_ai_assistant`、`mb_map`，以及灰区 5 页 `mb_service`（旧服务 Tab hub，职能已由首页九宫格承担）、`mb_expert`、`mb_feedback`、`mb_growth`、`mb_pest_risk`（均不在菌菇需求内，杂菌识别已替代病虫害口径）；孤儿图片 `images/orchard_apples.jpg` 一并删除（`images/` 空目录已移除）。
- 删除前已核对：保留页对这 20 页零引用；外部仅 `applefarm_backhand/enterprise_plot.html` 顶部注释提到 `mb_map.html`（该 PC 页本身仍是苹果口径、待改造，注释随之失效，改造时删除即可）。
- 移动端后续无待改造页面；新增页面须遵守第 3、5、7 节约定。

### PC 后台与数据大屏

- **PC 后台菜单内页面已全部完成（2026-11-16）**：`login.html` / `index.html` / `home.html` + 28 个菜单页（25 页改造 + 新建 `team_manage.html`、`env_monitor.html`），风格沿用原设计系统，数据统一接 `js/shared/fungi-store.js`（`window.FungiStore`，键 `mushroom_fungi_store_v1`）与 `js/shared/fungi-alert-data.js`（`window.FungiAlertData`，键 `mushroom_alerts_v1`）；两文件为冻结契约，改页面前先读。
- **后台无引用清理已完成（2026-11-16）**：按全项目引用图（保留页 + 外部入口可达性闭包）删除 111 个不可达文件（94 个苹果时期遗留 html：认养/商城/销售/模型/经营分析/旧设备/旧物料/后台版 mb_* 等，17 个孤儿 js/css/图片）。**注意**：`js/shared/` 下 alert-data/cert/harvest/mobile-ops/trace-stat/trace 等旧 store 仍被后台菜单页与追溯 H5 引用，**不可删**；`icons/icons.js` 被移动端 `mb_login.html` 引用。大屏本身仍是苹果口径，待后续改造。
- **大屏收敛为单文件（2026-11-17）**：数据大屏只保留 `da_index.html`（6 视图同文件切换），原 8 个独立大屏页（`da_overview`/`da_dashboard`/`da_business`/`da_alert`/`da_growth`/`da_iot`/`da_results`/`da_trace`）与 `vr_panorama.html` 全部删除——它们互相跳转形成独立入口集群，且业务对象仍是果园口径，与 `da_index.html` 的菌菇口径重复。连带删除：仅服务于这些页的 `css/dashboard-design-system.css`（零引用，苹果绿旧设计令牌）、`common/js/vr-hotspots.js`、`common/css/vr-styles.css`、`common/js/api-mock.js`（三者零引用，VR 热区/实景遗留）、以及 `js/shared/` 下 12 个仅被已删大屏页加载的旧 store（biz/data/device/enterprise/mall/material/model/plot-master-seed/production/sales/soil + `js/material-store.js`），现 `js/shared/` 只剩 alert-data / cert-store / device-ui / fungi-alert-data / fungi-store / harvest-store / mobile-ops-store / trace-stat-store / trace-store。`da_index.html` 仅外链 `../applefarm_backhand/js/shared/fungi-store.js`，追溯统计走 `FungiStore.traceStats()` 单点口径。
- **登录页演示账号自动填充（2026-11-16）**：后台 `login.html` 无记住凭据时预填 `admin / admin123`（7 天免登录与记住密码回填优先，逻辑不变）；移动端 `mb_login.html` 同条件预填 `demo / demo123`。两页均浏览器实测：预填→一键登录成功（后台进 index 超级管理员、移动端进首页访客），手动输入可覆盖预填值，控制台零报错。
- **公司名统一更换（2026-11-16）**：「湖南智农数果科技有限公司」→「托克逊县数字农业科技有限公司」，全库共 3 处（后台登录页技术支持/版权、`fungi-store.js` 种子 EN-01 企业名称）；store 加载层对旧缓存中的旧公司名做精确迁移（只替换旧名，自定义值不动），新种子/旧缓存两条路径均实测通过。追溯 H5 的「菇乡源生物科技（示例）有限公司」为另一示例主体，按「追溯不动」约束未改。企业信息中厂区地址（长沙）、电话（0731）、信用代码（91430100 开头）仍为湖南口径，是否随更名属地化待用户确认。

### 其他

- ~~首页九宫格的角色化配置（操作工/设备运维/质检/仓储）尚未实现。~~ 已完成：首页常用服务按 `loginRole` 关键词匹配角色显示高频入口；注意后台「作业人员账号」页的角色选项仍是旧口径（果农等），改造该页时需同步为菌菇岗位。
- 移动端部分页面的统计数字仍为静态演示值（「我的」页统计与消息角标已联动真实存储）。
- PC 与移动端数据打通、接口契约尚未建立。

---
