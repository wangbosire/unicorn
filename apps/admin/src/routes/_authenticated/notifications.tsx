import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/notifications/page'
import {
  ADMIN_PERMISSION_NOTIFICATIONS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/notifications')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_NOTIFICATIONS_READ],
    }),
  component: NotificationsPage,
})
