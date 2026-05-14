import { createFileRoute } from '@tanstack/react-router'
import { AdminUsersPage } from '@/features/system/admin-users-page'

export const Route = createFileRoute('/_authenticated/system/admin-users')({
  component: AdminUsersPage,
})
