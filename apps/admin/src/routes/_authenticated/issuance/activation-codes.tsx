import { createFileRoute } from '@tanstack/react-router'
import { ActivationCodesPage } from '@/features/issuance/activation-codes-page'
import {
  ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES,
  enforceAdminRouteAccess,
} from '@/lib/admin-route-access'

export const Route = createFileRoute('/_authenticated/issuance/activation-codes')({
  beforeLoad: () =>
    enforceAdminRouteAccess({
      allOfPermissions: [ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES],
    }),
  component: ActivationCodesPage,
})
