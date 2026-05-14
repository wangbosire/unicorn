import { createFileRoute } from '@tanstack/react-router'
import { TransfersPage } from '@/features/transfers/page'

export const Route = createFileRoute('/_authenticated/transfers')({
  component: TransfersPage,
})
