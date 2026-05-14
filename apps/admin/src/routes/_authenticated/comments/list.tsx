import { createFileRoute } from '@tanstack/react-router'
import { CommentListPage } from '@/features/comments/list-page'

export const Route = createFileRoute('/_authenticated/comments/list' as never)({
  component: CommentListPage,
})
