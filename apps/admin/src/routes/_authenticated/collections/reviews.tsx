import { createFileRoute } from '@tanstack/react-router'
import { CollectionReviewsPage } from '@/features/collections/reviews-page'

export const Route = createFileRoute('/_authenticated/collections/reviews' as never)({
  component: CollectionReviewsPage,
})
