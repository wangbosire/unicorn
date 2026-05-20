import { createFileRoute } from '@tanstack/react-router'
import { AuthorizationChangeLogsPage } from '@/features/system/authorization-change-logs-page'
import {
  ADMIN_PERMISSION_PERMISSIONS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute(
  '/_authenticated/system/authorization-change-logs'
)({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_PERMISSIONS_READ],
    }),
  component: AuthorizationChangeLogsPage,
})
