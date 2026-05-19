import { createFileRoute } from '@tanstack/react-router'
import { CommentListPage } from '@/features/comments/list-page'
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/comments/list')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE],
    }),
  component: CommentListPage,
})
