import { createFileRoute } from '@tanstack/react-router'
import { CommentReviewsPage } from '@/features/comments/reviews-page'
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_READ,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/comments/reviews')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      anyOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ],
    }),
  component: CommentReviewsPage,
})
