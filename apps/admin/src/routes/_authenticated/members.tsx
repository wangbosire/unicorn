import { createFileRoute } from '@tanstack/react-router'
import { MembersPage } from '@/features/members/page'

export const Route = createFileRoute('/_authenticated/members')({
  component: MembersPage,
})
