import { createFileRoute } from '@tanstack/react-router'
import { SeriesPage } from '@/features/issuance/series-page'
import {
  ADMIN_PERMISSION_ISSUANCE_SERIES,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/issuance/series')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_ISSUANCE_SERIES],
    }),
  component: SeriesPage,
})
