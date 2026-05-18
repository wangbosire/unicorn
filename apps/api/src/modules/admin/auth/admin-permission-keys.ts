/**
 * 后台权限点常量。
 * 与 Prisma `permissions.permission_key` 种子数据保持一致，供守卫与控制器声明使用。
 */
export const ADMIN_PERMISSION_DASHBOARD_READ = 'dashboard.read';

export const ADMIN_PERMISSION_ISSUANCE_SERIES = 'issuance.series';

export const ADMIN_PERMISSION_ISSUANCE_BATCHES = 'issuance.batches';

export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES =
  'issuance.activation_codes';

export const ADMIN_PERMISSION_COLLECTIONS_MANAGE = 'collections.manage';

export const ADMIN_PERMISSION_COLLECTION_REVIEWS_MANAGE =
  'collection_reviews.manage';

export const ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE =
  'collection_comments.manage';

/** 会员列表只读（M3 会员管理入口）。 */
export const ADMIN_PERMISSION_MEMBERS_READ = 'members.read';

/** 会员状态变更（冻结/解冻等）。 */
export const ADMIN_PERMISSION_MEMBERS_MANAGE = 'members.manage';

/** 占位：M2+ 页面导航，仅超级管理员可见。 */
export const ADMIN_PERMISSION_NAV_M2_PLACEHOLDER = 'nav.m2_placeholder';

/** 超级管理员全权标记，写入 JWT 与权限表。 */
export const ADMIN_PERMISSION_WILDCARD = '*';
