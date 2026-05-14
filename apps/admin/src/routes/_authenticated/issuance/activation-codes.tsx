import { createFileRoute } from '@tanstack/react-router'
import { ActivationCodesPage } from '@/features/issuance/activation-codes-page'

export const Route = createFileRoute('/_authenticated/issuance/activation-codes' as never)({
  component: ActivationCodesPage,
})
