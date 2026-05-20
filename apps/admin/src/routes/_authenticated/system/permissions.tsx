import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '@/features/system/permissions-page'
import {
  ADMIN_PERMISSION_PERMISSIONS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/system/permissions')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_PERMISSIONS_READ],
    }),
  component: PermissionsPage,
})
