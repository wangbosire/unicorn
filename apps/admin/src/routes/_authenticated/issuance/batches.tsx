import { createFileRoute } from '@tanstack/react-router'
import { BatchesPage } from '@/features/issuance/batches-page'

export const Route = createFileRoute('/_authenticated/issuance/batches' as never)({
  component: BatchesPage,
})
