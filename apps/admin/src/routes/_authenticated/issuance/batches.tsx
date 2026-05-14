import { createFileRoute } from '@tanstack/react-router'
import { BatchesPage } from '@/features/issuance/batches-page'
import { enforceIssuanceRouteAccess } from '@/lib/issuance-route-guard'

export const Route = createFileRoute('/_authenticated/issuance/batches')({
  beforeLoad: enforceIssuanceRouteAccess,
  component: BatchesPage,
})
