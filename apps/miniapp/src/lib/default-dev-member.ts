/**
 * 联调阶段默认会员主键（无本地存储、未登录时回落；与后端种子数据对齐）。
 * 独立文件避免被 `member-api` 的 Taro 依赖间接引入到单测环境。
 */
export const DEFAULT_DEV_MEMBER_ID = 'cmp5k3avx0000ltbwvmykpl65'
