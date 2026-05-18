import {
  AdminUserStatus,
  CollectionTransferMode,
  CollectionTransferStatus,
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
  CollectionCommentReviewSource,
  CollectionCommentStatus,
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
      id: 'perm_collections_manage',
      key: 'collections.manage',
      name: '藏品管理',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_collection_reviews_manage',
      key: 'collection_reviews.manage',
      name: '藏品内容复核',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_collection_comments_manage',
      key: 'collection_comments.manage',
      name: '评论治理',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_members_read',
      key: 'members.read',
      name: '会员列表',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_members_manage',
      key: 'members.manage',
      name: '会员状态管理',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_notifications_manage',
      key: 'notifications.manage',
      name: '通知中心',
      type: PermissionType.PAGE,
    },
    {
      id: 'perm_transfers_manage',
      key: 'transfers.manage',
      name: '转让记录',
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
    'perm_collections_manage',
    'perm_collection_reviews_manage',
    'perm_collection_comments_manage',
    'perm_members_read',
    'perm_members_manage',
    'perm_notifications_manage',
    'perm_transfers_manage',
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

/**
 * 写入通知中心演示数据，
 * 便于后台页面展示真实通知摘要与发送状态。
 */
async function seedNotificationDemo() {
  const messageRows: Array<{
    id: string;
    memberId: string;
    memberNo: string;
    nickname: string;
    messageType: NotificationMessageType;
    title: string;
    content: string;
    readAt: Date | null;
    createdAt: Date;
    dispatches: Array<{
      id: string;
      channel: NotificationChannel;
      status: NotificationDispatchStatus;
      providerResponse: string | null;
      sentAt: Date | null;
      createdAt: Date;
    }>;
  }> = [
    {
      id: 'seed_msg_activate_success',
      memberId: 'seed_mem_notification_activate',
      memberNo: 'MEM-SEED-NOTIFY-001',
      nickname: 'Seed 激活通知会员',
      messageType: NotificationMessageType.ACTIVATE_SUCCESS,
      title: '激活成功，欢迎查看你的藏品',
      content: '你的激活码已使用成功，藏品已进入“我的藏品”。',
      readAt: new Date('2026-05-18T09:20:00.000Z'),
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
      dispatches: [
        {
          id: 'seed_dispatch_activate_in_app',
          channel: NotificationChannel.IN_APP,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'in-app delivered',
          sentAt: new Date('2026-05-18T09:00:10.000Z'),
          createdAt: new Date('2026-05-18T09:00:10.000Z'),
        },
        {
          id: 'seed_dispatch_activate_miniapp',
          channel: NotificationChannel.MINIAPP_SUBSCRIPTION,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'template message accepted',
          sentAt: new Date('2026-05-18T09:00:20.000Z'),
          createdAt: new Date('2026-05-18T09:00:20.000Z'),
        },
      ],
    },
    {
      id: 'seed_msg_content_takedown',
      memberId: 'seed_mem_notification_review',
      memberNo: 'MEM-SEED-NOTIFY-002',
      nickname: 'Seed 审核通知会员',
      messageType: NotificationMessageType.CONTENT_TAKEDOWN,
      title: '你的公开内容已被人工下架',
      content: '因运营复核，该公开展示已下架，请返回编辑页查看详情。',
      readAt: null,
      createdAt: new Date('2026-05-18T10:30:00.000Z'),
      dispatches: [
        {
          id: 'seed_dispatch_takedown_in_app',
          channel: NotificationChannel.IN_APP,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'stored in message center',
          sentAt: new Date('2026-05-18T10:30:05.000Z'),
          createdAt: new Date('2026-05-18T10:30:05.000Z'),
        },
        {
          id: 'seed_dispatch_takedown_mp',
          channel: NotificationChannel.WECHAT_MP,
          status: NotificationDispatchStatus.FAILED,
          providerResponse: 'openid not bound',
          sentAt: null,
          createdAt: new Date('2026-05-18T10:30:10.000Z'),
        },
      ],
    },
    {
      id: 'seed_msg_comment_review',
      memberId: 'seed_mem_notification_comment',
      memberNo: 'MEM-SEED-NOTIFY-003',
      nickname: 'Seed 评论通知会员',
      messageType: NotificationMessageType.COMMENT_REVIEW_RESULT,
      title: '你的评论正在等待人工审核',
      content: '评论已提交成功，待人工审核通过后会公开显示。',
      readAt: null,
      createdAt: new Date('2026-05-18T11:10:00.000Z'),
      dispatches: [
        {
          id: 'seed_dispatch_comment_in_app',
          channel: NotificationChannel.IN_APP,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'stored in message center',
          sentAt: new Date('2026-05-18T11:10:05.000Z'),
          createdAt: new Date('2026-05-18T11:10:05.000Z'),
        },
        {
          id: 'seed_dispatch_comment_miniapp',
          channel: NotificationChannel.MINIAPP_SUBSCRIPTION,
          status: NotificationDispatchStatus.PENDING,
          providerResponse: 'waiting for async worker',
          sentAt: null,
          createdAt: new Date('2026-05-18T11:10:20.000Z'),
        },
      ],
    },
  ];

  for (const row of messageRows) {
    await prisma.member.upsert({
      where: { id: row.memberId },
      create: {
        id: row.memberId,
        memberNo: row.memberNo,
        nickname: row.nickname,
        avatarUrl: null,
        mobile: null,
        status: MemberStatus.ACTIVE,
        registeredAt: row.createdAt,
      },
      update: {
        nickname: row.nickname,
        status: MemberStatus.ACTIVE,
      },
    });

    await prisma.notificationMessage.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        memberId: row.memberId,
        messageType: row.messageType,
        title: row.title,
        content: row.content,
        readAt: row.readAt,
        createdAt: row.createdAt,
      },
      update: {
        messageType: row.messageType,
        title: row.title,
        content: row.content,
        readAt: row.readAt,
      },
    });

    for (const dispatch of row.dispatches) {
      await prisma.notificationDispatchRecord.upsert({
        where: { id: dispatch.id },
        create: {
          id: dispatch.id,
          messageId: row.id,
          channel: dispatch.channel,
          status: dispatch.status,
          providerResponse: dispatch.providerResponse,
          sentAt: dispatch.sentAt,
          createdAt: dispatch.createdAt,
        },
        update: {
          channel: dispatch.channel,
          status: dispatch.status,
          providerResponse: dispatch.providerResponse,
          sentAt: dispatch.sentAt,
        },
      });
    }
  }
}

/**
 * 写入转让记录演示数据，
 * 便于后台页面验证转让方式、状态筛选与流转去向展示。
 */
async function seedTransferDemo() {
  const baseAt = new Date('2026-05-17T08:00:00.000Z');

  const members = [
    {
      id: 'seed_mem_transfer_sender',
      memberNo: 'MEM-SEED-TRANSFER-001',
      nickname: 'Seed 转让发起会员',
    },
    {
      id: 'seed_mem_transfer_target',
      memberNo: 'MEM-SEED-TRANSFER-002',
      nickname: 'Seed 指定接收会员',
    },
    {
      id: 'seed_mem_transfer_receiver',
      memberNo: 'MEM-SEED-TRANSFER-003',
      nickname: 'Seed 转让码接收会员',
    },
  ] as const;

  for (const member of members) {
    await prisma.member.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        memberNo: member.memberNo,
        nickname: member.nickname,
        avatarUrl: null,
        mobile: null,
        status: MemberStatus.ACTIVE,
        registeredAt: baseAt,
      },
      update: {
        nickname: member.nickname,
        status: MemberStatus.ACTIVE,
      },
    });
  }

  await prisma.series.upsert({
    where: { id: 'seed_ser_transfer_demo' },
    create: {
      id: 'seed_ser_transfer_demo',
      seriesNo: 'SER-SEED-TRANSFER',
      name: 'Seed 转让演示系列',
      description: 'prisma seed 写入，用于后台转让记录列表联调与演示。',
      status: SeriesStatus.ENABLED,
    },
    update: {
      name: 'Seed 转让演示系列',
      status: SeriesStatus.ENABLED,
    },
  });

  await prisma.issuanceBatch.upsert({
    where: { id: 'seed_bat_transfer_demo' },
    create: {
      id: 'seed_bat_transfer_demo',
      batchNo: 'BAT-SEED-TRANSFER',
      seriesId: 'seed_ser_transfer_demo',
      name: 'Seed 转让演示批次',
      quantity: 100,
      activateValidFrom: baseAt,
      activateValidTo: new Date('2028-12-31T23:59:59.000Z'),
      status: IssuanceBatchStatus.ENABLED,
    },
    update: {
      status: IssuanceBatchStatus.ENABLED,
    },
  });

  const collectionRows: Array<{
    id: string;
    collectionNo: string;
    currentOwnerMemberId: string;
    claimedAt: Date;
  }> = [
    {
      id: 'seed_col_transfer_pending',
      collectionNo: 'COL-SEED-TRANSFER-001',
      currentOwnerMemberId: 'seed_mem_transfer_sender',
      claimedAt: new Date('2026-05-17T08:30:00.000Z'),
    },
    {
      id: 'seed_col_transfer_completed',
      collectionNo: 'COL-SEED-TRANSFER-002',
      currentOwnerMemberId: 'seed_mem_transfer_receiver',
      claimedAt: new Date('2026-05-17T09:30:00.000Z'),
    },
    {
      id: 'seed_col_transfer_cancelled',
      collectionNo: 'COL-SEED-TRANSFER-003',
      currentOwnerMemberId: 'seed_mem_transfer_sender',
      claimedAt: new Date('2026-05-17T10:30:00.000Z'),
    },
    {
      id: 'seed_col_transfer_expired',
      collectionNo: 'COL-SEED-TRANSFER-004',
      currentOwnerMemberId: 'seed_mem_transfer_sender',
      claimedAt: new Date('2026-05-17T11:30:00.000Z'),
    },
  ];

  for (const row of collectionRows) {
    await prisma.collection.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        collectionNo: row.collectionNo,
        seriesId: 'seed_ser_transfer_demo',
        batchId: 'seed_bat_transfer_demo',
        status: CollectionStatus.OWNED,
        currentOwnerMemberId: row.currentOwnerMemberId,
        claimedAt: row.claimedAt,
      },
      update: {
        status: CollectionStatus.OWNED,
        currentOwnerMemberId: row.currentOwnerMemberId,
        claimedAt: row.claimedAt,
      },
    });
  }

  const transferRows: Array<{
    id: string;
    transferNo: string;
    collectionId: string;
    fromMemberId: string;
    toMemberId: string | null;
    transferMode: CollectionTransferMode;
    transferCode: string | null;
    status: CollectionTransferStatus;
    expiredAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }> = [
    {
      id: 'seed_transfer_pending',
      transferNo: 'TR-SEED-0001',
      collectionId: 'seed_col_transfer_pending',
      fromMemberId: 'seed_mem_transfer_sender',
      toMemberId: 'seed_mem_transfer_target',
      transferMode: CollectionTransferMode.DIRECT_MEMBER,
      transferCode: null,
      status: CollectionTransferStatus.PENDING_ACCEPT,
      expiredAt: new Date('2026-05-24T08:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T08:00:00.000Z'),
    },
    {
      id: 'seed_transfer_completed',
      transferNo: 'TR-SEED-0002',
      collectionId: 'seed_col_transfer_completed',
      fromMemberId: 'seed_mem_transfer_sender',
      toMemberId: 'seed_mem_transfer_receiver',
      transferMode: CollectionTransferMode.TRANSFER_CODE,
      transferCode: 'XFER-SEED-8888',
      status: CollectionTransferStatus.COMPLETED,
      expiredAt: new Date('2026-05-23T08:00:00.000Z'),
      completedAt: new Date('2026-05-18T10:30:00.000Z'),
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    },
    {
      id: 'seed_transfer_cancelled',
      transferNo: 'TR-SEED-0003',
      collectionId: 'seed_col_transfer_cancelled',
      fromMemberId: 'seed_mem_transfer_sender',
      toMemberId: 'seed_mem_transfer_target',
      transferMode: CollectionTransferMode.DIRECT_MEMBER,
      transferCode: null,
      status: CollectionTransferStatus.CANCELLED,
      expiredAt: new Date('2026-05-25T08:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T11:00:00.000Z'),
    },
    {
      id: 'seed_transfer_expired',
      transferNo: 'TR-SEED-0004',
      collectionId: 'seed_col_transfer_expired',
      fromMemberId: 'seed_mem_transfer_sender',
      toMemberId: null,
      transferMode: CollectionTransferMode.TRANSFER_CODE,
      transferCode: 'XFER-SEED-9999',
      status: CollectionTransferStatus.EXPIRED,
      expiredAt: new Date('2026-05-18T12:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T07:00:00.000Z'),
    },
  ];

  for (const row of transferRows) {
    await prisma.collectionTransferOrder.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        transferNo: row.transferNo,
        collectionId: row.collectionId,
        fromMemberId: row.fromMemberId,
        toMemberId: row.toMemberId,
        transferMode: row.transferMode,
        transferCode: row.transferCode,
        status: row.status,
        expiredAt: row.expiredAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
      },
      update: {
        transferNo: row.transferNo,
        toMemberId: row.toMemberId,
        transferMode: row.transferMode,
        transferCode: row.transferCode,
        status: row.status,
        expiredAt: row.expiredAt,
        completedAt: row.completedAt,
      },
    });
  }
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

/** 固定主键：便于 `prisma db seed` 幂等写入一条「评论待人工审核」演示数据。 */
const COMMENT_PENDING_MANUAL_DEMO = {
  memberId: 'seed_mem_comment_pending_manual',
  seriesId: 'seed_ser_comment_pending_manual',
  batchId: 'seed_bat_comment_pending_manual',
  collectionId: 'seed_col_comment_pending_manual',
  contentVersionId: 'seed_ccv_comment_pending_manual',
  commentId: 'seed_comment_pending_manual',
  reviewRecordId: 'seed_ccrr_pending_manual',
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

/**
 * 写入一条评论人工审核演示数据，
 * 便于本地打开后台「评论审核队列」默认筛即可看到待处理评论。
 */
async function seedPendingManualCommentReviewDemo() {
  const at = new Date('2026-05-16T12:00:00.000Z');
  const publishedAt = new Date('2026-05-16T12:10:00.000Z');
  const commentCreatedAt = new Date('2026-05-16T12:20:00.000Z');

  await prisma.member.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.memberId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.memberId,
      memberNo: 'MEM-SEED-COMMENT-PENDING-MANUAL',
      nickname: 'Seed 评论待复核会员',
      avatarUrl: null,
      mobile: null,
      status: MemberStatus.ACTIVE,
      registeredAt: at,
    },
    update: {
      nickname: 'Seed 评论待复核会员',
      status: MemberStatus.ACTIVE,
    },
  });

  await prisma.series.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.seriesId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.seriesId,
      seriesNo: 'SER-SEED-COMMENT-PENDING-MANUAL',
      name: 'Seed 评论审核演示系列',
      description: 'prisma seed 写入，用于后台评论审核队列演示。',
      status: SeriesStatus.ENABLED,
    },
    update: {
      name: 'Seed 评论审核演示系列',
      status: SeriesStatus.ENABLED,
    },
  });

  await prisma.issuanceBatch.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.batchId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.batchId,
      batchNo: 'BAT-SEED-COMMENT-PENDING-MANUAL',
      seriesId: COMMENT_PENDING_MANUAL_DEMO.seriesId,
      name: 'Seed 评论审核演示批次',
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
    where: { id: COMMENT_PENDING_MANUAL_DEMO.collectionId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.collectionId,
      collectionNo: 'COL-SEED-COMMENT-PENDING-MANUAL',
      seriesId: COMMENT_PENDING_MANUAL_DEMO.seriesId,
      batchId: COMMENT_PENDING_MANUAL_DEMO.batchId,
      status: CollectionStatus.OWNED,
      currentOwnerMemberId: COMMENT_PENDING_MANUAL_DEMO.memberId,
      claimedAt: at,
    },
    update: {
      status: CollectionStatus.OWNED,
      currentOwnerMemberId: COMMENT_PENDING_MANUAL_DEMO.memberId,
      claimedAt: at,
    },
  });

  await prisma.collectionContentVersion.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.contentVersionId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.contentVersionId,
      collectionId: COMMENT_PENDING_MANUAL_DEMO.collectionId,
      versionNo: 1,
      title: 'Seed 评论审核标题',
      summary: '用于后台评论审核队列联调的已公开内容版本。',
      coverImageUrl: null,
      contentPayload: { blocks: [] },
      editStatus: CollectionContentEditStatus.APPROVED,
      publishStatus: CollectionContentPublishStatus.PUBLISHED,
      submittedAt: at,
      publishedAt,
      createdByMemberId: COMMENT_PENDING_MANUAL_DEMO.memberId,
    },
    update: {
      title: 'Seed 评论审核标题',
      summary: '用于后台评论审核队列联调的已公开内容版本。',
      editStatus: CollectionContentEditStatus.APPROVED,
      publishStatus: CollectionContentPublishStatus.PUBLISHED,
      submittedAt: at,
      publishedAt,
    },
  });

  await prisma.collectionComment.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.commentId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.commentId,
      collectionId: COMMENT_PENDING_MANUAL_DEMO.collectionId,
      contentVersionId: COMMENT_PENDING_MANUAL_DEMO.contentVersionId,
      memberId: COMMENT_PENDING_MANUAL_DEMO.memberId,
      content: '这是一条用于后台评论审核队列演示的待人工复核评论。',
      status: CollectionCommentStatus.PENDING_MANUAL,
      publishedAt: null,
      createdAt: commentCreatedAt,
    },
    update: {
      content: '这是一条用于后台评论审核队列演示的待人工复核评论。',
      status: CollectionCommentStatus.PENDING_MANUAL,
      publishedAt: null,
    },
  });

  await prisma.collectionCommentReviewRecord.upsert({
    where: { id: COMMENT_PENDING_MANUAL_DEMO.reviewRecordId },
    create: {
      id: COMMENT_PENDING_MANUAL_DEMO.reviewRecordId,
      commentId: COMMENT_PENDING_MANUAL_DEMO.commentId,
      reviewStatus: CollectionCommentStatus.PENDING_MANUAL,
      reviewSource: CollectionCommentReviewSource.SYSTEM,
      reviewReason: 'machine review escalated to manual review',
      reviewedAt: null,
      createdAt: commentCreatedAt,
    },
    update: {
      reviewStatus: CollectionCommentStatus.PENDING_MANUAL,
      reviewSource: CollectionCommentReviewSource.SYSTEM,
      reviewReason: 'machine review escalated to manual review',
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
  await seedPendingManualCommentReviewDemo();
  await seedNotificationDemo();
  await seedTransferDemo();
}

main()
  .then(async () => {
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    console.log(
      '[prisma seed] admin: admin / Admin123! , viewer / Viewer123! | content review demo: COL-SEED-PENDING-MANUAL (review seed_crr_pending_manual) | comment review demo: COL-SEED-COMMENT-PENDING-MANUAL (comment seed_comment_pending_manual) | notification demo: seed_msg_activate_success / seed_msg_content_takedown / seed_msg_comment_review | transfer demo: TR-SEED-0001 / TR-SEED-0002 / TR-SEED-0003 / TR-SEED-0004',
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
