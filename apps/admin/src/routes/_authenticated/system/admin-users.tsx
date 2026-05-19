import { createFileRoute } from '@tanstack/react-router'
import { AdminUsersPage } from '@/features/system/admin-users-page'
import {
  ADMIN_PERMISSION_ADMIN_USERS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/system/admin-users')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_ADMIN_USERS_READ],
    }),
  component: AdminUsersPage,
})
