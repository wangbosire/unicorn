import { createFileRoute } from '@tanstack/react-router'
import { BatchesPage } from '@/features/issuance/batches-page'
import {
  ADMIN_PERMISSION_ISSUANCE_BATCHES,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/issuance/batches')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_ISSUANCE_BATCHES],
    }),
  component: BatchesPage,
})
