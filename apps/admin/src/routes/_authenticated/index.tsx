import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import {
  ADMIN_PERMISSION_DASHBOARD_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_DASHBOARD_READ],
    }),
  component: Dashboard,
})
