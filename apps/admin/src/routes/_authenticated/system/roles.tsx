import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/system/roles-page'

export const Route = createFileRoute('/_authenticated/system/roles' as never)({
  component: RolesPage,
})
