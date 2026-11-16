# 食用菌工厂化农业数据管理平台（HTML 原型）

> 交接说明 · 最后更新：2026-11-16
> 后续接手的 Agent（WorkBuddy / Qcoder 等）请先读完本文件，再读 `docs/需求说明书.md`，然后开始改页面。

---

## 0. 接手前必读

1. **需求基准**：`docs/需求说明书.md`（页面清单、字段、流程以它为准）。
2. **视觉基准**：双面品牌 v2.1（见第 3 节）——工厂移动端 = 中性画布 + 品牌棕点缀（`css/mobile-design-system.css`）；消费者追溯 `html/applefarm_h5/trace_h5.html` 保留全棕暖调，两面不混用。
3. **本轮改造范围**：移动端 `html/applefarm_mobile/` 的登录、首页、监测、监控及首页九个业务入口。
4. **还没改完**：移动端其余页面、PC 后台、数据大屏仍是苹果/果园口径（见第 8 节）。

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
| `html/applefarm_backhand/` | PC 后台（本轮未改） |
| `html/applefarm_dataanlye/` | 数据大屏（本轮未改） |
| `html/portal.html` | 统一登录聚合门户（入口矩阵 + 系统服务状态，见 4.4） |
| `html/common/js/portal_data.js` | 门户系统元数据（四端入口/版本/服务状态/演示账号），不含生产数据 |
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
| `applefarm_mobile/mb_login.html` | 登录 | 菌菇主题、菇房背景、食用菌文案、协议/隐私政策改写、演示账号角色改为车间操作工 |
| `applefarm_mobile/mb_home.html` | 车间工作台 | 问候区（姓名/岗位/工号/菇房/日期）、今日待办 4 项（抽屉：建议/执行/采纳/关闭）置于环境卡之前、当前菇房环境紧凑状态条（适宜度+四指标一行，点击展开详情；有 GF-01 未处置预警时显示异常横幅并自动置顶，处置后恢复适宜态，与预警台账互通）、常用服务按登录角色显示高频入口（操作工/运维/质检/仓储，管理员与访客显示全部，「全部」Tile 展开九宫格）、今日动态三联卡、离线同步条、铃铛与「我的」角标跟随消息未读数 |
| `applefarm_mobile/mb_device.html` | 监测 Tab | 菇房选择、适宜性评估、温度/湿度/CO₂/光照、SVG 曲线（1min/1h/1d）、越限记录、6 台设备控制（启停二次确认、阈值步进、自动/手动、报修） |
| `applefarm_mobile/vr_panorama.html` | 监控 Tab | 整页重写为视频监控：8 路通道（在线/告警/离线）、2×2/3×3、全屏模拟预览、回放时间轴与倍速、AI 抓拍列表 |

### 4.2 首页九个业务入口

| 入口 | 文件 | 核心业务逻辑 | 存储键 |
|---|---|---|---|
| 扫码开工 | `mb_label.html` | 批次码格式校验、重复开工拦截、批次卡、工序选择、开工登记、带参跳转工序填报 | `mushroom_scan_jobs` |
| 工序填报 | `mb_record_task.html` | 拌料/灭菌/接种/培养/出菇/采收 6 类台账、字段级校验、照片凭证、待同步重试 | `mushroom_process_records` |
| 采收过磅 | `mb_yield.html` | 批次联动、总重/一级/二级校验、等外重与一级率自动计算、二次确认、CS 单号、今日汇总 | `mushroom_harvest_records` |
| 质量抽检 | `mb_patrol.html` | 抽样数/均重/直径校验、色泽/形态/气味/杂质判定、结论自动生成、不合格强制处置、ZJ 单号 | `mushroom_quality_records` |
| 预警处置 | `mb_alert.html` | 蓝/黄/橙/红四级预警、状态与级别筛选、处置措施+结果回填、已处置留痕、可转维修工单 | `mushroom_alert_records` |
| 杂菌识别 | `mb_disease.html` | 样例图片上传、扫描动画、绿霉识别结果（置信度/风险）、4 条处置建议、一键污染上报 | `mushroom_contamination_reports` |
| 设备控制 | `mb_device.html` | 见 4.1，设备列表与详情抽屉 | — |
| 设备报修 | `mb_troubleshoot.html` | 设备+回路号、故障描述、紧急程度、手机号校验、WX 工单、受理/完成流转 | `mushroom_repair_orders` |
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

- 结构：左侧品牌区（厂名锁定式双行标题、**四张工厂场景轮播**：接种→培养→出菇→冷库，6s 自动播放、悬停/聚焦暂停、可暂停按钮、箭头/圆点/滑动/方向键切换、底部进度条；图片与说明在 `portal_data.js meta.scenes`）+ 项目编号/平台版本/覆盖规模、四端服务状态清单；右侧入口矩阵，分两组：**壹 需登录·厂内员工**（管理后台、移动应用端）与**贰 免登录·直开**（生产数据大屏、消费者溯源 H5）。
- 每张入口卡只陈述"登录契约"：适用角色、进入方式、3 项核心功能、演示账号（带复制按钮）、进入 CTA；**不含任何生产实时指标**（KPI/告警/菇房曲线/工序照片条已全部删除）。
- **页面不写解释性文案**（用户要求）：无"继续上次"条、无分组旁注/组下注、无卡片服务更新日期、无政策声明行、无品牌导语——用户进来直接看入口判断。`localStorage.portal_last_sys` 仍记录最近进入的系统，但只驱动卡上"常用"徽标；移动登录与溯源示例附**真实可扫二维码**（`common/js/qrcode.js` 离线生成 SVG；`file://` 预览时二维码说明自动降级为"本地预览 · 部署后扫码生效"）。
- 复制按钮失败时有可见反馈（选中账号文本提示 Ctrl+C），不会静默失败。
- 门户**不设统一登录表单、不收集/存储密码**；认证在各端登录页完成。
- 系统状态口径是"服务是否正常 + 版本号"，不是生产状态；实时数据进对应系统查看。
- 视觉沿用松绿 + 琥珀台账语言与工程网格底纹；390/760/1080/1440 四档实测无横向溢出。

---

## 5. 移动端导航与入口约定

- 底部 4 个主 Tab：**首页** `mb_home.html` / **监测** `mb_device.html` / **监控** `vr_panorama.html` / **我的** `mb_mine.html`。
- 首页常用服务（只放“动作型入口”，按登录角色显示高频 4 项 + 「全部」展开完整九宫格；管理员/访客显示全部）：

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

- `applefarm_backhand/` 仍有约 138 个文件包含果园/苹果口径，`applefarm_dataanlye/` 有 10 个；门户 `portal.html` 已是食用菌。
- 建议按需求第 1 章先做范围裁剪（认养、商城、销售、模型、经营分析等本期不做），再逐个改主流程页面。

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

清理轮删除文件（20 页 + 1 图，经用户确认）：

```text
html/applefarm_mobile/mb_adoption.html / mb_adoption_browse.html / mb_adoption_cert.html /
mb_adoption_detail.html / mb_adoption_farming.html / mb_adoption_harvest.html / mb_adoption_tagging.html
html/applefarm_mobile/mb_price.html / mb_plan.html / mb_plot.html / mb_draw_plot.html
html/applefarm_mobile/mb_drone_patrol.html / mb_weather_predict.html / mb_ai_assistant.html / mb_map.html
html/applefarm_mobile/mb_service.html / mb_expert.html / mb_feedback.html / mb_growth.html / mb_pest_risk.html
html/applefarm_mobile/images/orchard_apples.jpg（images/ 空目录随之移除）
```
