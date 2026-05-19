import { createFileRoute } from '@tanstack/react-router'
import { TransfersPage } from '@/features/transfers/page'
import {
  ADMIN_PERMISSION_TRANSFERS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/transfers')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_TRANSFERS_READ],
    }),
  component: TransfersPage,
})
