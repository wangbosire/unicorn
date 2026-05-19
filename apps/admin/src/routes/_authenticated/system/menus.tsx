import { createFileRoute } from '@tanstack/react-router'
import { MenusPage } from '@/features/system/menus-page'
import {
  ADMIN_PERMISSION_MENUS_READ,
  ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/system/menus')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [
        ADMIN_PERMISSION_MENUS_READ,
        ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
      ],
    }),
  component: MenusPage,
})
