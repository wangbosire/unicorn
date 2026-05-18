# M4 验收清单

## 文档目标

本文档用于保留 M4「流转与通知闭环」的验收范围、自动化回归口径与演示脚本，与 [一期里程碑总览](../active/milestones-overview.md)、[V1 执行计划](../active/v1-exec-plan.md) 对齐，作为 **M4 已归档** 后的阶段验收基线与复盘依据。

## 当前状态

- 状态：`completed`（M4「流转与通知闭环」已于 2026-05-18 完成归档；本次归档基于后台与会员侧主链路、自动化回归及 smoke 验证结果）
- 上位计划：[V1 执行计划](../active/v1-exec-plan.md)
- 前置里程碑：M3（见 [M3 验收清单（已归档）](../completed/m3-acceptance-checklist.md)）
- 当前实现快照：后台仪表盘、通知中心、转让记录、会员正式 Bearer 鉴权，以及会员侧基础消息/转让链路均已接入真实数据或真实鉴权路径

## 目标结果

- 形成后台首页、通知总览、转让记录三块能力的统一验收口径。
- 将会员侧登录鉴权切换到正式 access token 的结果纳入本轮联调验收，避免继续依赖 mock 登录假设。
- 提供单一回归命令与可执行演示脚本，便于阶段签字与后续回归。

## 范围冻结结论

- **仪表盘**：验收当前已具备真实 Prisma 模型支撑的运营统计，不虚构通知或转让聚合指标。
- **通知中心**：验收通知消息与派发记录总览、失败摘要与渠道覆盖；当前不将异步发送 worker、本地模板编辑器视为本轮通过前提。
- **转让体系**：已验收后台转让记录列表、方式/状态筛选、去向展示与演示种子数据；会员侧已补齐基础转让记录、发起转让与转让码接收链路，通知异步编排与更细粒度转让运营能力仍保留在后续扩展范围内。
- **正式会员鉴权**：会员接口默认以 `Authorization: Bearer <memberAccessToken>` 作为联调入口；历史 `mock-member-token:*` 仅保留旧会话兼容解析，不再作为默认演示路径。

## 范围内事项

- 后台首页真实统计：激活码、藏品、内容复核、评论审核、会员总量等指标。
- 后台通知总览：消息总数、未读数、待发送 / 失败计数、按消息类型聚合的最近发送情况。
- 后台转让记录治理：转让单分页、藏品编号筛选、转让方式筛选、状态筛选、流转去向展示。
- 会员正式登录与当前身份确认：微信小程序登录、`auth/me`、冻结账号拦截、会员侧消息中心与基础转让链路联调。
- 与上述能力直接相关的 API / Admin / Miniapp 自动化回归。

## 范围外事项

- 通知模板管理、异步派发 worker、真实微信渠道投递成功率保障。
- 会员端更细粒度的转让撤销、补偿、异常重试与运营审计增强。
- 评论治理专项本身的实现与验收；该部分已作为独立专项先行完成，不在本清单展开。

## 依赖关系

- 依赖 M3 已完成的会员治理与正式鉴权改造，否则无法用同一会员令牌验证后台演示与小程序联调口径。
- 依赖 `prisma db seed` 已写入通知与转让演示数据，用于后台页面开箱验证。
- 依赖后台 RBAC 种子中已授予超级管理员 `dashboard.read`、`notifications.manage`、`transfers.manage` 权限。

## 与现有实现的对接点

- 仪表盘：`GET /admin-api/dashboard/overview`，后台首页 `/` 对接真实统计。
- 通知中心：`GET /admin-api/notifications/overview`，后台页面 `/notifications` 展示消息与派发摘要。
- 转让记录：`GET /admin-api/transfers`，后台页面 `/transfers` 支持分页、状态/方式/藏品编号筛选。
- 正式会员登录：`POST /member-api/auth/wechat-miniapp` 返回正式 member access token，`GET /member-api/auth/me` 要求 `Authorization: Bearer <memberAccessToken>`。
- 小程序首页与个人页：登录后缓存当前会员 access token，未登录时不再使用默认种子会员兜底。

## 自动化回归口径

- 统一回归命令：仓库根目录执行 `pnpm test:m4`
- `apps/api`：覆盖仪表盘、通知中心、转让记录、会员正式登录鉴权的 controller / HTTP / service 关键路径。
- `apps/admin`：覆盖转让展示层筛选参数、状态映射与接收方展示。
- `apps/miniapp`：覆盖正式登录后的会话摘要、会员接口错误文案映射。

通过标准：

- `pnpm test:m4` 全量通过。
- 若本轮继续调整仪表盘 / 通知 / 转让 / 会员正式鉴权逻辑，需同步补齐到 `pnpm test:m4` 覆盖范围。

## 演示准备

建议先执行：

```bash
pnpm --filter @unicorn/api exec prisma db seed
pnpm verify:m4
```

预期：

- 种子输出包含通知演示 `seed_msg_activate_success`、`seed_msg_content_takedown`、`seed_msg_comment_review`
- 种子输出包含转让演示 `TR-SEED-0001`、`TR-SEED-0002`、`TR-SEED-0003`、`TR-SEED-0004`
- `pnpm verify:m4` 会串行执行 `pnpm test:m4` 与 `pnpm smoke:m4`，先完成自动化回归，再做接口级演示核验
- 若只想在手工演示前做轻量接口预检，可单独执行 `pnpm smoke:m4`

可选参数：

- `API_BASE_URL=http://localhost:3000/api`：覆盖脚本默认接口地址
- `ENABLE_MEMBER_FREEZE_CHECK=1`：额外执行“冻结 -> `MEMBER_ACCOUNT_FROZEN` -> 解冻恢复”的可回滚检查

## 演示脚本

1. **后台登录**：使用种子管理员账号登录后台，进入首页 `/`，确认首页不再展示静态假数据，而是可看到真实统计卡片与待办信息。
2. **仪表盘核验**：确认首页至少可看到「待人工复核内容」「待人工审核评论」「会员总数」等卡片，且“统计说明”明确声明当前只展示后端已具备真实模型支撑的指标。
3. **通知中心核验**：打开 `/notifications`，确认总览卡片与“通知摘要”表格可展示真实消息类型聚合；至少能看到 `ACTIVATE_SUCCESS`、`CONTENT_TAKEDOWN`、`COMMENT_REVIEW_RESULT` 三类事件。
4. **通知失败摘要**：在通知摘要中确认 `CONTENT_TAKEDOWN` 可展示失败派发记录，便于运营看到如 `openid not bound` 一类失败说明。
5. **转让记录核验**：打开 `/transfers`，确认列表存在 `TR-SEED-0001` 到 `TR-SEED-0004` 演示数据，并可按状态、转让方式、藏品编号筛选。
6. **转让筛选**：以 `COL-SEED-TRANSFER-001` 为藏品编号过滤，确认仅返回对应转让单；切换为 `PENDING_ACCEPT`、`COMPLETED`、`EXPIRED` 等状态时，列表刷新符合预期。
7. **会员正式登录**：在小程序首页执行微信登录，或直接调用登录接口：

```bash
curl -i http://localhost:3000/api/member-api/auth/wechat-miniapp \
  -H 'Content-Type: application/json' \
  -d '{"code":"wechat-login-code"}'
```

预期：

- 返回 `200` 或 `201` 包装成功响应
- `data.accessToken` 为正式 member token
- `data.member` 返回真实会员编号与状态

8. **会员身份确认**：使用上一步拿到的 access token 调用：

```bash
curl -i http://localhost:3000/api/member-api/auth/me \
  -H 'Authorization: Bearer <memberAccessToken>'
```

预期：

- 返回 `200 OK`
- 返回当前会员编号、状态、微信绑定数、持有藏品数等资料

9. **冻结账号拦截**：在后台会员管理中冻结该测试会员后再次请求 `GET /member-api/auth/me`，预期返回业务码 `MEMBER_ACCOUNT_FROZEN`；解冻后恢复 `200 OK`。

## 出入口标准

### M4 入口条件

- M3 审核治理闭环与评论治理专项已完成，后台可提供稳定的会员、评论、审核基础数据。
- 会员登录默认联调路径已切换为正式 Bearer access token。

### M4 出口条件

- 后台仪表盘、通知中心、转让记录页面可按本清单一次演示走通。
- `pnpm test:m4` 可稳定通过，并覆盖本轮已交付的真实边界。
- `pnpm smoke:m4` 可在本地联调环境重复通过，作为手工演示前的接口级预检。
- `pnpm verify:m4` 可作为当前 M4 最推荐的一键验收入口。
- 文档已明确说明当前未纳入本轮验收的会员端完整转让闭环与通知异步 worker，避免误判范围。

## 决策日志

- 2026-05-18：新增本清单，作为 M4 仪表盘 / 通知 / 转让与正式会员鉴权切换的统一验收基线。
- 2026-05-18：新增仓库根命令 `pnpm test:m4`，统一后台仪表盘、通知中心、转让记录与会员正式鉴权的自动化回归入口。
- 2026-05-18：新增 `pnpm smoke:m4` 与 `scripts/m4-acceptance-smoke.sh`，将 M4 演示脚本中的关键接口核验落为可重复执行的本地 smoke 检查。
- 2026-05-18：新增 `pnpm verify:m4` 作为推荐的一键验收入口，并在 smoke 脚本启动前补充 `admin-api/health` 预检。
- 2026-05-18：冻结当前 M4 验收边界为“后台运营闭环优先”，会员侧完整转让接收链路与通知异步派发 worker 不作为本轮通过前提。
