import { createFileRoute } from '@tanstack/react-router'
import { CollectionListPage } from '@/features/collections/list-page'
import {
  ADMIN_PERMISSION_COLLECTIONS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/collections/list')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_COLLECTIONS_READ],
    }),
  component: CollectionListPage,
})
