import { createFileRoute } from '@tanstack/react-router'
import { CommentReviewsPage } from '@/features/comments/reviews-page'

export const Route = createFileRoute('/_authenticated/comments/reviews')({
  component: CommentReviewsPage,
})
