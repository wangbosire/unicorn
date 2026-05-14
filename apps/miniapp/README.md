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

## 当前状态

- 已完成小程序应用基础目录
- 已预留主要任务流页面入口
- 已接入 M1 联调所需的激活、我的藏品和当前会员信息最小链路
- 当前默认通过 `src/config/runtime.ts` 指向本地 `member-api`
- 尚未接入真实会员登录、内容编辑和消息通知正式链路
