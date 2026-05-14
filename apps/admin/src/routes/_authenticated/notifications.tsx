import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/notifications/page'

export const Route = createFileRoute('/_authenticated/notifications' as never)({
  component: NotificationsPage,
})
