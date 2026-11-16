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

### 运行方式

```powershell
cd d:\dev\pro_ediblefungi
python -m http.server 8899 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8899/index.html
```

> 不要直接双击 `file://` 打开，部分页面依赖相对资源与 `fetch`，建议始终走本地 HTTP 服务。

---

## 2. 目录速览

| 路径 | 说明 |
|---|---|
| `docs/需求说明书.md` | 需求基准（改页面前必读） |
| `html/applefarm_mobile/` | 移动端 15 个菌菇页面、`css/mobile-design-system.css`、`js/mobile-store.js`、`js/mobile-messages.js`；苹果时期无关页面已删除（见 8） |
| `html/applefarm_h5/` | 追溯 H5；`images/trace_*.jpg` 是移动端改版公用图片素材 |
| `html/applefarm_backhand/` | PC 后台：登录/主框架/首页 + 28 个菜单页已菌菇化（见 8）；菜单外遗留页仍是苹果口径 |
| `html/applefarm_dataanlye/` | 数据大屏（本轮未改） |
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
| `applefarm_mobile/mb_login.html` | 登录 | 系统名「食用菌移动助手」（标题/系统名/微信授权弹窗/协议文本统一）、菌菇主题、菇房背景、食用菌文案、协议/隐私政策改写、演示账号角色改为车间操作工 |
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
- **跨端契约键名（勿改名）**：`smartorchard_sync_queue`（PC `js/shared/mobile-bridge.js`、`mb_sync_queue.html` 按此名读队列）、`smartorchard_current_user`（登录页写入，H5 `js/h5-auth.js` 与 PC `js/shared/mobile-ops-store.js` 读取）。历史命名保留仅为兼容读取方。
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
- **后台无引用清理已完成（2026-11-16）**：按全项目引用图（保留页 + 外部入口可达性闭包）删除 111 个不可达文件（94 个苹果时期遗留 html：认养/商城/销售/模型/经营分析/旧设备/旧物料/后台版 mb_* 等，17 个孤儿 js/css/图片），后台现仅 75 个文件（30 html + 31 js + 7 css + 6 图 + 1 vendor）。**注意**：`js/shared/` 下 alert-data/biz/cert/data/device/enterprise/harvest/mall/mobile-ops/model/plot-master-seed/production/sales/soil/trace-stat/trace 等旧 store 仍被数据大屏 `applefarm_dataanlye/` 与追溯 H5 引用，**不可删**；`js/material-store.js`、`icons/icons.js` 同理被外部引用。大屏本身仍是苹果口径，待后续改造。
- 批次 A 已完成（2026-11-16）：企业管理 5 页（`enterprise_info` / `enterprise_base` / `material_info` / `team_manage` / `guide_standard`）+ 生产管理 7 页（`material_io` / `harvest_report` / `farming_record` / `harvest_record` / `harvest_plan` / `harvest_process` / `harvest_storage`）。真实流转：菌包制备扣物料库存、灭菌复判通过闭环 `FA-261116-02` 并转接种、采收预冷交接生成预冷库存 lot、出库 FIFO 校验。
- 批次 B 已完成（2026-11-16）：设备管理 5 页（`device_info` / `env_monitor` / `device_control` / `device_maintain` / `device_spare`）+ 预警管理 2 页（`alert_overview` / `alert_settings`）。真实流转：工单完成扣备件库存并写出库流水（不足阻断）、设定值/启停写指令表、预警分派→闭环必填处置措施、`env_monitor` 30s 单定时器刷新。
- 批次 C 已完成（2026-11-16）：追溯管理 5 页（`trace_code` / `trace_batch` / `trace_blockchain` / `trace_query` / `data_source`）+ 系统管理 3 页（`system_settings` / `menu_settings` / `user_settings`）全部菌菇化并接 `js/shared/fungi-store.js` 单一真源；`index.html` 仅追加一段品牌脚本（读 `mushroom_sys_settings` 同步 `#brandText` 与标题）。新增本机键：`mushroom_sys_settings`、`mushroom_reg_config`、`mushroom_op_log`；账号/权限沿用 `snzg_user_accounts` / `snzg_permissions`（菜单权限键为 `角色中文名:分组:菜单名` 白名单）。系统设置「重置演示数据」只清业务数据+日志，保留账号与配置。

### 其他

- ~~首页九宫格的角色化配置（操作工/设备运维/质检/仓储）尚未实现。~~ 已完成：首页常用服务按 `loginRole` 关键词匹配角色显示高频入口；注意后台「作业人员账号」页的角色选项仍是旧口径（果农等），改造该页时需同步为菌菇岗位。
- 移动端部分页面的统计数字仍为静态演示值（「我的」页统计与消息角标已联动真实存储）。
- PC 与移动端数据打通、接口契约尚未建立。

---

## 9. 交接自检清单

改完任意移动端页面后至少执行：

```powershell
# 1) 残留文案检查（结果应为 0）
#    用编辑器的全局搜索或：
Select-String -Path html/applefarm_mobile/*.html -Pattern "果园|苹果|果农|地块|农事|巡园|花牛|天水|农资|病虫"

# 2) 启动本地服务，浏览器逐页检查控制台
python -m http.server 8899 --bind 127.0.0.1
```

- 确认新页面 `<style>` 顶部有完整主题变量块，且 `body` 使用 `var(--bg)`。
- 确认没有新增 CDN、外部字体或 `file://` 依赖。
- 确认所有 `onclick` 都有对应函数，危险操作有二次确认。
- 内联脚本可用 `node --check` 粗校验；HTML 标签可用 Python `html.parser` 粗检。
- 新增弹窗/抽屉时检查 `id` 是否重复。

---

## 10. 本轮改动文件清单

```text
README.md（本文件，新增）

html/portal.html（重写为统一登录聚合页）
html/common/js/portal_data.js（重写为系统元数据）
html/common/js/qrcode.js（新增，vendored MIT qrcode-generator@1.4.4）

html/applefarm_mobile/mb_login.html
html/applefarm_mobile/mb_home.html
html/applefarm_mobile/mb_device.html
html/applefarm_mobile/vr_panorama.html
html/applefarm_mobile/mb_label.html
html/applefarm_mobile/mb_record_task.html
html/applefarm_mobile/mb_yield.html
html/applefarm_mobile/mb_patrol.html
html/applefarm_mobile/mb_alert.html
html/applefarm_mobile/mb_troubleshoot.html
html/applefarm_mobile/mb_disease.html
html/applefarm_mobile/mb_material.html
html/applefarm_mobile/js/mobile-messages.js（新增）
html/applefarm_mobile/js/mobile-store.js（清理苹果时期死 API 与注释）
html/applefarm_mobile/css/mobile-design-system.css（v2.1：品牌棕阶+中性画布+惯例语义色+数字等宽清单）
html/applefarm_mobile/mb_news.html
html/applefarm_mobile/mb_news_detail.html
html/applefarm_mobile/mb_mine.html
```

> v2.1 视觉轮：15 页旧「全棕暖调」主题块统一替换为中性画布块（品牌棕/语义色改由设计系统源头继承）；登录 logo 底色改 token 引用；首页铃铛红点与监控告警点改 `var(--error)`。
> 已通过浏览器实测的业务链路：扫码开工 → 工序填报、冷库入库/出库、预警处置；首页铃铛 → 消息通知 → 预警处置反馈（含转报修生成 WX 工单）→ 预警处置页状态互通 → 我的（统计/角标/作业记录/设置/退出确认）、全部已读后铃铛红点与角标隐藏；首页环境卡异常置顶/处置后恢复紧凑态、各角色服务配置与「全部」展开；页面均无控制台报错。
> v2.1 视觉回归（15/15 页，强制刷缓存后实测）：画布 `#FAF9F7`、卡片纯白、语义四色浅底惯例值、头部/主按钮棕渐变、数字等宽、预警四级色正确、登录→首页链路正常；追溯 H5 未改动。

> Mock 种子轮（2026-11-16，按用户逐页指令）：`mb_label`（4 开工）/ `mb_record_task`（8 台账）/ `mb_yield`（6 磅单）/ `mb_patrol`（6 抽检）/ `mb_disease`（4 识别历史）/ `mb_troubleshoot`（6 工单）各页内置 `seedXIfEmpty()`，统一守卫＝键缺失、JSON 解析失败或空数组时才写入，已有数据绝不覆盖；日期全部相对今天生成。跨页一致性：扫码↔工序批次互相呼应，采收↔抽检今日同批次（采后抽检），`mb_yield`/`mb_patrol` 批次字典同步补 2 个历史批次；`mb_mine` 三本台账（作业 8/采收 6/报修 6）与统计、角标直接读同一存储键，无需单独种子。浏览器实测：各页条数/汇总/详情弹窗/照片渲染正确、控制台零报错、强刷重载后条数不变（幂等）；`mb_label` 样例码 `JB-20261116-03/04`、`JB-20261115-08` 扫码黄金路径不受种子拦截。未实施（待用户批准的原清单）：共享 `js/mobile-seeds.js`、首页今日动态派生、监测页告警汇总派生、图表美化（曲线平滑/触摸提示/环形渐变/等级堆叠条等）。

清理轮删除文件（20 页 + 1 图，经用户确认）：

```text
html/applefarm_mobile/mb_adoption.html / mb_adoption_browse.html / mb_adoption_cert.html /
mb_adoption_detail.html / mb_adoption_farming.html / mb_adoption_harvest.html / mb_adoption_tagging.html
html/applefarm_mobile/mb_price.html / mb_plan.html / mb_plot.html / mb_draw_plot.html
html/applefarm_mobile/mb_drone_patrol.html / mb_weather_predict.html / mb_ai_assistant.html / mb_map.html
html/applefarm_mobile/mb_service.html / mb_expert.html / mb_feedback.html / mb_growth.html / mb_pest_risk.html
html/applefarm_mobile/images/orchard_apples.jpg（images/ 空目录随之移除）
```

PC 后台菌菇化轮（2026-11-16，三批并行 + 集成回归）：

```text
html/applefarm_backhand/login.html / index.html / home.html（前轮已完成；index 本轮仅追加品牌同步脚本）
html/applefarm_backhand/js/shared/fungi-store.js（新增，冻结数据契约）
html/applefarm_backhand/js/shared/fungi-alert-data.js（扩展持久化与 update/add/reset，冻结）
html/applefarm_backhand/enterprise_info.html / enterprise_base.html / material_info.html /
team_manage.html（新建）/ guide_standard.html / material_io.html / harvest_report.html /
farming_record.html / harvest_record.html / harvest_plan.html / harvest_process.html / harvest_storage.html
html/applefarm_backhand/device_info.html / env_monitor.html（新建）/ device_control.html /
device_maintain.html / device_spare.html / alert_overview.html / alert_settings.html
html/applefarm_backhand/trace_code.html / trace_batch.html / trace_blockchain.html /
trace_query.html / data_source.html / system_settings.html / menu_settings.html / user_settings.html
```

> 集成回归 136/136 通过（无头 Chrome CDP 实测）：登录→主框架→28 菜单页 iframe 逐页加载零报错、1600/1000 双宽度无横向溢出；跨页链路实测：灭菌复判→预警闭环、预冷交接→仓储 lot、工单完成→备件扣减、死信重发→监管预警闭环、菜单权限白名单隐藏菜单、平台名称→index 品牌/标题同步。
> 演示状态卫生：各批与集成测试结束均已清空测试写入（`mushroom_*` 业务键删除后种子自动再生；`snzg_permissions` / `snzg_user_accounts` 测试配置已移除）；QA 目录与 8899 服务已清理停止。

后台无引用清理轮（2026-11-16，引用图闭包判定 + 132/132 实测回归）：

```text
删除 111 个后台不可达文件：
  html 94：adoption_*（7）、mall_*（16）、sales_*（8）、model_*（8）、report_*（4）、
  device_access/asset/audit/calibration/command/log/model/stats（8）、material_config/inventory/label/return/supplier/usage（6）、
  mb_*（10，后台版旧移动页）、alert_device/farming/internal_report（3）、biz_*（3）、
  drone_log/patrol、farming_patrol/plan、enterprise_plot、gateway_config、guide_calculator、
  harvest_post、patrol_route、performance_dashboard/detail、soil_test_record、task_assign、
  video_monitor、vr_panorama、achievement_record、data_collection、cert_issue、cert_manage、
  trace_config、trace_statistics
  js 14：export-helper、iframe-hide、material-dict、sidebar-layout、shared/_*.check（5）、
  shared/adoption-store、demo-seed、mobile-bridge、model-bind
  css 3：mall-subpage、model-page、sales-module；images 1：gis_base.jpg
根目录 QA 草稿同步清除：.tmp_*_check.js 等 9 个脚本 + .tmp_img/
配套修正：enterprise_info 证书抽屉移除指向遗留 cert_manage 的冗余按钮（证书 CRUD 已在页内）；
  23 个缺 favicon 的保留页补内联 SVG icon（与批次 B 七页同款）
保留 75 文件：30 html（login/index/home + 28 菜单页）、31 js、7 css、6 菌菇实景 png、1 vendor
```

> 清理后回归 132/132：30 保留页独立打开零 404/零控制台报错/无溢出、index iframe 逐页 walked、门户/大屏 9 页/移动 2 页/追溯 H5 共 14 个外部入口零指向后台已删文件的 404；大屏渲染完整（其依赖的后台旧 store 全部保留）。
