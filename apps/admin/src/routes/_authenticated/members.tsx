import { createFileRoute } from '@tanstack/react-router'
import { MembersPage } from '@/features/members/page'
import {
  ADMIN_PERMISSION_MEMBERS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/members')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_MEMBERS_READ],
    }),
  component: MembersPage,
})
