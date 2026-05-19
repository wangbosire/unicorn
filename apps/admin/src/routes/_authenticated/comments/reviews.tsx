import { createFileRoute } from '@tanstack/react-router'
import { CommentReviewsPage } from '@/features/comments/reviews-page'
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/comments/reviews')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE],
    }),
  component: CommentReviewsPage,
})
