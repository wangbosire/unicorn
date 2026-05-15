import {
  AdminUserStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewSource,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  CollectionStatus,
  IssuanceBatchStatus,
  MemberStatus,
  PermissionType,
  PrismaClient,
  RoleStatus,
  SeriesStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_PASSWORD_HASH =
  '$2b$10$wVUc2zEkjCPqWGf3HhasGeeqrZr4pm30nVhpFCb53BxOepLkGCca.';

const VIEWER_PASSWORD_HASH =
  '$2b$10$xQHexNXQ/szYSPxTiqwIw.QA6veqIzYGavywoRs02yXQ6NqTEKecO';

async function seedPermissions() {
  const rows: {
    id: string;
    key: string;
    name: string;
    type: PermissionType;
  }[] = [
    {
      id: 'perm_wildcard',
      key: '*',
      name: '超级管理员全权',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_dashboard_read',
      key: 'dashboard.read',
      name: '仪表盘访问',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_issuance_series',
      key: 'issuance.series',
      name: '系列管理',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_issuance_batches',
      key: 'issuance.batches',
      name: '发行批次',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_issuance_activation_codes',
      key: 'issuance.activation_codes',
      name: '激活码管理',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_collection_reviews_manage',
      key: 'collection_reviews.manage',
      name: '藏品内容复核',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_nav_m2_placeholder',
      key: 'nav.m2_placeholder',
      name: 'M2+ 占位导航',
      type: PermissionType.PAGE,
    },
  ];

  for (const row of rows) {
    await prisma.permission.upsert({
      where: { permissionKey: row.key },
      create: {
        id: row.id,
        permissionKey: row.key,
        permissionName: row.name,
        permissionType: row.type,
      },
      update: {
        permissionName: row.name,
        permissionType: row.type,
      },
    });
  }
}

async function seedRoles() {
  await prisma.role.upsert({
    where: { roleKey: 'super_admin' },
    create: {
      id: 'role_super_admin',
      roleKey: 'super_admin',
      roleName: '超级管理员',
      status: RoleStatus.ENABLED,
    },
    update: { status: RoleStatus.ENABLED },
  });

  await prisma.role.upsert({
    where: { roleKey: 'viewer' },
    create: {
      id: 'role_viewer',
      roleKey: 'viewer',
      roleName: '仅仪表盘访客',
      status: RoleStatus.ENABLED,
    },
    update: { status: RoleStatus.ENABLED },
  });

  const superLinks = [
    'perm_wildcard',
    'perm_dashboard_read',
    'perm_issuance_series',
    'perm_issuance_batches',
    'perm_issuance_activation_codes',
    'perm_collection_reviews_manage',
    'perm_nav_m2_placeholder',
  ];

  await prisma.rolePermission.deleteMany({
    where: { roleId: 'role_super_admin' },
  });

  for (const permissionId of superLinks) {
    await prisma.rolePermission.create({
      data: {
        roleId: 'role_super_admin',
        permissionId,
      },
    });
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: 'role_viewer' },
  });

  await prisma.rolePermission.create({
    data: {
      roleId: 'role_viewer',
      permissionId: 'perm_dashboard_read',
    },
  });
}

/** 固定主键：便于 `prisma db seed` 幂等写入一条「待人工复核」演示数据。 */
const PENDING_MANUAL_DEMO = {
  memberId: 'seed_mem_pending_manual',
  seriesId: 'seed_ser_pending_manual',
  batchId: 'seed_bat_pending_manual',
  collectionId: 'seed_col_pending_manual',
  contentVersionId: 'seed_ccv_pending_manual',
  reviewRecordId: 'seed_crr_pending_manual',
} as const;

/**
 * 写入一条与 `CONTENT_MANUAL_GATE_AFTER_MACHINE` 机审通过后一致的人工队列数据，
 * 便于本地打开后台「内容复核」默认筛即可看到待处理行。
 */
async function seedPendingManualReviewDemo() {
  const at = new Date('2026-05-15T12:00:00.000Z');

  await prisma.member.upsert({
    where: { id: PENDING_MANUAL_DEMO.memberId },
    create: {
      id: PENDING_MANUAL_DEMO.memberId,
      memberNo: 'MEM-SEED-PENDING-MANUAL',
      nickname: 'Seed 待人工复核会员',
      avatarUrl: null,
      mobile: null,
      status: MemberStatus.ACTIVE,
      registeredAt: at,
    },
    update: {
      nickname: 'Seed 待人工复核会员',
      status: MemberStatus.ACTIVE,
    },
  });

  await prisma.series.upsert({
    where: { id: PENDING_MANUAL_DEMO.seriesId },
    create: {
      id: PENDING_MANUAL_DEMO.seriesId,
      seriesNo: 'SER-SEED-PENDING-MANUAL',
      name: 'Seed 复核演示系列',
      description: 'prisma seed 写入，用于后台「待人工复核」队列演示。',
      status: SeriesStatus.ENABLED,
    },
    update: {
      name: 'Seed 复核演示系列',
      status: SeriesStatus.ENABLED,
    },
  });

  await prisma.issuanceBatch.upsert({
    where: { id: PENDING_MANUAL_DEMO.batchId },
    create: {
      id: PENDING_MANUAL_DEMO.batchId,
      batchNo: 'BAT-SEED-PENDING-MANUAL',
      seriesId: PENDING_MANUAL_DEMO.seriesId,
      name: 'Seed 复核演示批次',
      quantity: 1000,
      activateValidFrom: at,
      activateValidTo: new Date('2028-12-31T23:59:59.000Z'),
      status: IssuanceBatchStatus.ENABLED,
    },
    update: {
      status: IssuanceBatchStatus.ENABLED,
    },
  });

  await prisma.collection.upsert({
    where: { id: PENDING_MANUAL_DEMO.collectionId },
    create: {
      id: PENDING_MANUAL_DEMO.collectionId,
      collectionNo: 'COL-SEED-PENDING-MANUAL',
      seriesId: PENDING_MANUAL_DEMO.seriesId,
      batchId: PENDING_MANUAL_DEMO.batchId,
      status: CollectionStatus.OWNED,
      currentOwnerMemberId: PENDING_MANUAL_DEMO.memberId,
      claimedAt: at,
    },
    update: {
      status: CollectionStatus.OWNED,
      currentOwnerMemberId: PENDING_MANUAL_DEMO.memberId,
      claimedAt: at,
    },
  });

  await prisma.collectionContentVersion.upsert({
    where: { id: PENDING_MANUAL_DEMO.contentVersionId },
    create: {
      id: PENDING_MANUAL_DEMO.contentVersionId,
      collectionId: PENDING_MANUAL_DEMO.collectionId,
      versionNo: 1,
      title: 'Seed 待人工标题',
      summary: '用于后台内容复核页「待人工复核」默认筛的演示数据。',
      coverImageUrl: null,
      contentPayload: { blocks: [] },
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      submittedAt: at,
      publishedAt: null,
      createdByMemberId: PENDING_MANUAL_DEMO.memberId,
    },
    update: {
      title: 'Seed 待人工标题',
      summary: '用于后台内容复核页「待人工复核」默认筛的演示数据。',
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      submittedAt: at,
      publishedAt: null,
    },
  });

  await prisma.collectionContentReviewRecord.upsert({
    where: { id: PENDING_MANUAL_DEMO.reviewRecordId },
    create: {
      id: PENDING_MANUAL_DEMO.reviewRecordId,
      collectionId: PENDING_MANUAL_DEMO.collectionId,
      contentVersionId: PENDING_MANUAL_DEMO.contentVersionId,
      reviewStage: CollectionContentReviewStage.MANUAL,
      reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: '同步机审策略已通过，待人工复核',
      reviewedAt: null,
    },
    update: {
      reviewStage: CollectionContentReviewStage.MANUAL,
      reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: '同步机审策略已通过，待人工复核',
      reviewedAt: null,
    },
  });
}

async function seedAdminUsers() {
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    create: {
      id: 'admin_user_seed_admin',
      accountNo: 'ADM000001',
      username: 'admin',
      displayName: '系统管理员',
      passwordHash: ADMIN_PASSWORD_HASH,
      status: AdminUserStatus.ACTIVE,
    },
    update: {
      passwordHash: ADMIN_PASSWORD_HASH,
      status: AdminUserStatus.ACTIVE,
      displayName: '系统管理员',
    },
  });

  await prisma.adminUser.upsert({
    where: { username: 'viewer' },
    create: {
      id: 'admin_user_seed_viewer',
      accountNo: 'ADM000002',
      username: 'viewer',
      displayName: '访客账号',
      passwordHash: VIEWER_PASSWORD_HASH,
      status: AdminUserStatus.ACTIVE,
    },
    update: {
      passwordHash: VIEWER_PASSWORD_HASH,
      status: AdminUserStatus.ACTIVE,
      displayName: '访客账号',
    },
  });

  await prisma.adminUserRole.deleteMany({
    where: {
      adminUserId: { in: ['admin_user_seed_admin', 'admin_user_seed_viewer'] },
    },
  });

  await prisma.adminUserRole.createMany({
    data: [
      { adminUserId: 'admin_user_seed_admin', roleId: 'role_super_admin' },
      { adminUserId: 'admin_user_seed_viewer', roleId: 'role_viewer' },
    ],
  });
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedAdminUsers();
  await seedPendingManualReviewDemo();
}

main()
  .then(async () => {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.log(
      '[prisma seed] admin: admin / Admin123! , viewer / Viewer123! | demo queue: COL-SEED-PENDING-MANUAL (review seed_crr_pending_manual)',
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
