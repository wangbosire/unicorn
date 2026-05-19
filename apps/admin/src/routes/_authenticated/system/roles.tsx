import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/system/roles-page'
import {
  ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
  ADMIN_PERMISSION_ROLES_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/system/roles')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [
        ADMIN_PERMISSION_ROLES_READ,
        ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
      ],
    }),
  component: RolesPage,
})
