# Miniapp

TaroJS 小程序应用骨架目录。

## 目标定位

会员端小程序承担一期 C 端主任务流，重点覆盖：

- 授权登录
- 激活我的藏品
- 我的藏品
- 藏品编辑
- 公开展示浏览
- 消息中心
- 转让

## 推荐页面分组

- `pages/auth`：登录、授权、绑定
- `pages/activate`：激活码输入与激活结果
- `pages/collections`：我的藏品、详情、编辑
- `pages/public`：公开展示页
- `pages/messages`：站内消息
- `pages/comments`：评论互动
- `pages/profile`：个人中心

## 本地开发

在仓库根目录安装依赖后，于本包目录执行：

- `pnpm dev:h5`：H5 联调（默认 `10086` 端口，可按 `config/index.ts` 与 `UNICORN_DOCKER_DEV` 使用 `/api` 反代）
- `pnpm dev`：微信小程序产物监听编译
- `pnpm test`：Vitest 纯函数单测
- `pnpm lint` / `pnpm run build`：类型检查与 weapp 构建

联调基地址见 `src/config/runtime.ts`；可在开发者工具写入 `unicorn_member_api_base_url` 覆盖。

## 当前状态

- 已完成小程序应用基础目录与主要任务流页面骨架
- 已接入 M1：激活、我的藏品列表、当前会员信息、微信登录换 mock token（联调）
- 已接入 M2：`pages/collection-edit`（草稿 / 提交审核）、`pages/collection-public`（匿名公开展示）、列表内已公开快捷入口；个人中心提供「前往我的藏品」；首页「会员身份」卡片展示 **当前请求上下文**（与 `requestMemberApi` 注入逻辑一致，不含 token 明文），并支持下拉刷新
- **底部 tabBar**：首页 / 藏品 / 我的；图标位于 `src/assets/tab/`（构建时拷贝到 `dist/assets/tab/`），可按设计稿替换
- 当前默认通过 `src/config/runtime.ts` 指向本地 `member-api`（与 `public-api` 同基址前缀）
- **测试**：在本包执行 `pnpm test` 运行 Vitest（`test/lib`：`member-mock-token`、`member-api-errors`、`public-api-errors`、`public-collection-content` 含正文去重、`collection-content-draft`、`member-session-display`）；`pnpm run build` / `pnpm run build:h5` 做编译校验。若在**仓库根目录**执行 `pnpm test`，会通过 Turborepo 跑全仓脚本（含 `apps/admin` 浏览器单测，需本机 Playwright）；仅需 API + 本包单测时可于根目录执行 `pnpm test:api-miniapp`，详见根目录 [README.md](../../README.md)「测试（Monorepo）」
- 消息通知仍为占位说明页；生产环境微信登录与正式鉴权待后续里程碑替换 mock
