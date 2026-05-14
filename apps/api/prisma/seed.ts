import {
  AdminUserStatus,
  PermissionType,
  PrismaClient,
  RoleStatus,
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
}

main()
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log('[prisma seed] admin users: admin / Admin123! , viewer / Viewer123!');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
