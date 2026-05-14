import { createFileRoute } from '@tanstack/react-router'
import { SeriesPage } from '@/features/issuance/series-page'
import { enforceIssuanceRouteAccess } from '@/lib/issuance-route-guard'

export const Route = createFileRoute('/_authenticated/issuance/series')({
  beforeLoad: enforceIssuanceRouteAccess,
  component: SeriesPage,
})
