import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentAdmin } from '@/apis/admin-auth'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const token = useAuthStore.getState().auth.accessToken
    if (!token) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    if (!useAuthStore.getState().auth.user) {
      try {
        const me = await getCurrentAdmin()
        useAuthStore.getState().auth.setUser({
          id: me.user.id,
          accountNo: me.user.accountNo,
          username: me.user.username,
          displayName: me.user.displayName,
          roles: me.user.roles,
          permissionKeys: me.user.permissionKeys,
        })
      } catch {
        useAuthStore.getState().auth.reset()
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }
    }
  },
  component: AuthenticatedLayout,
})
