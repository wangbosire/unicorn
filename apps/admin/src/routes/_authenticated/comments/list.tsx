import { createFileRoute } from '@tanstack/react-router'
import { CommentListPage } from '@/features/comments/list-page'
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/comments/list')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      anyOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ],
    }),
  component: CommentListPage,
})
