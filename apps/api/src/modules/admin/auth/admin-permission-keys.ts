/**
 * 后台权限点常量。
 * 与 Prisma `permissions.permission_key` 种子数据保持一致，供守卫与控制器声明使用。
 */
export const ADMIN_PERMISSION_DASHBOARD_READ = 'dashboard.read';

export const ADMIN_PERMISSION_ISSUANCE_SERIES = 'issuance.series';
export const ADMIN_PERMISSION_ISSUANCE_SERIES_CREATE =
  'issuance.series.create';
export const ADMIN_PERMISSION_ISSUANCE_SERIES_UPDATE =
  'issuance.series.update';
export const ADMIN_PERMISSION_ISSUANCE_SERIES_TOGGLE_STATUS =
  'issuance.series.toggle_status';

export const ADMIN_PERMISSION_ISSUANCE_BATCHES = 'issuance.batches';
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_CREATE =
  'issuance.batches.create';
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_UPDATE =
  'issuance.batches.update';
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_TOGGLE_STATUS =
  'issuance.batches.toggle_status';

export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES =
  'issuance.activation_codes';
export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES_GENERATE =
  'issuance.activation_codes.generate';
export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES_VOID =
  'issuance.activation_codes.void';

export const ADMIN_PERMISSION_COLLECTIONS_READ = 'collections.read';
export const ADMIN_PERMISSION_COLLECTIONS_TOGGLE_STATUS =
  'collections.toggle_status';

export const ADMIN_PERMISSION_COLLECTION_REVIEWS_READ =
  'collection_reviews.read';
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE =
  'collection_reviews.approve';
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT =
  'collection_reviews.reject';
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN =
  'collection_reviews.takedown';

export const ADMIN_PERMISSION_COLLECTION_COMMENTS_READ =
  'collection_comments.read';
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE =
  'collection_comments.approve';
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT =
  'collection_comments.reject';
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK =
  'collection_comments.block';

/** 通知中心访问与查询。 */
export const ADMIN_PERMISSION_NOTIFICATIONS_READ = 'notifications.read';
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_CREATE =
  'notifications.template.create';
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_UPDATE =
  'notifications.template.update';
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_TOGGLE_STATUS =
  'notifications.template.toggle_status';
export const ADMIN_PERMISSION_NOTIFICATIONS_DISPATCH_RETRY =
  'notifications.dispatch.retry';

/** 转让记录访问与查询。 */
export const ADMIN_PERMISSION_TRANSFERS_READ = 'transfers.read';
export const ADMIN_PERMISSION_TRANSFERS_COMPLETE = 'transfers.complete';
export const ADMIN_PERMISSION_TRANSFERS_ROLLBACK = 'transfers.rollback';
export const ADMIN_PERMISSION_TRANSFERS_EXPIRE = 'transfers.expire';
export const ADMIN_PERMISSION_TRANSFERS_SYNC_OWNER = 'transfers.sync_owner';

/** 会员列表只读（M3 会员管理入口）。 */
export const ADMIN_PERMISSION_MEMBERS_READ = 'members.read';

/** 会员冻结。 */
export const ADMIN_PERMISSION_MEMBERS_FREEZE = 'members.freeze';

/** 会员解冻。 */
export const ADMIN_PERMISSION_MEMBERS_UNFREEZE = 'members.unfreeze';

/** 后台用户只读查询。 */
export const ADMIN_PERMISSION_ADMIN_USERS_READ = 'admin_users.read';

/** 后台用户角色分配。 */
export const ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES = 'admin_users.assign_roles';

/** 角色只读查询。 */
export const ADMIN_PERMISSION_ROLES_READ = 'roles.read';

/** 角色权限分配。 */
export const ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS =
  'roles.assign_permissions';

/** 权限点只读查询。 */
export const ADMIN_PERMISSION_PERMISSIONS_READ = 'permissions.read';

/** 权限组只读查询。 */
export const ADMIN_PERMISSION_PERMISSION_GROUPS_READ = 'permission_groups.read';

/** 权限组成员编辑。 */
export const ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE =
  'permission_groups.update';

/** 菜单只读查询。 */
export const ADMIN_PERMISSION_MENUS_READ = 'menus.read';

/** 菜单绑定与配置修改。 */
export const ADMIN_PERMISSION_MENUS_UPDATE = 'menus.update';

/** 占位：M2+ 页面导航，仅超级管理员可见。 */
export const ADMIN_PERMISSION_NAV_M2_PLACEHOLDER = 'nav.m2_placeholder';

/** 超级管理员全权标记，写入 JWT 与权限表。 */
export const ADMIN_PERMISSION_WILDCARD = '*';
