import { createFileRoute } from '@tanstack/react-router'
import { ActivationCodesPage } from '@/features/issuance/activation-codes-page'
import { enforceIssuanceRouteAccess } from '@/lib/issuance-route-guard'

export const Route = createFileRoute('/_authenticated/issuance/activation-codes')({
  beforeLoad: enforceIssuanceRouteAccess,
  component: ActivationCodesPage,
})
