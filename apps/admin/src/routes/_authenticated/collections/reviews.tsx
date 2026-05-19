import { createFileRoute } from '@tanstack/react-router'
import { CollectionReviewsPage } from '@/features/collections/reviews-page'
import {
  ADMIN_PERMISSION_COLLECTION_REVIEWS_MANAGE,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/collections/reviews')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_COLLECTION_REVIEWS_MANAGE],
    }),
  component: CollectionReviewsPage,
})
