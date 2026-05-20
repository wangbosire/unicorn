import { createFileRoute } from '@tanstack/react-router'
import { PermissionGroupsPage } from '@/features/system/permission-groups-page'
import {
  ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/system/permission-groups')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_PERMISSION_GROUPS_READ],
    }),
  component: PermissionGroupsPage,
})
