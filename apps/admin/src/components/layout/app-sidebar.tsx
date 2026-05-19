import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminNavigation } from '@/apis/admin-auth'
import { useLayout } from '@/context/layout-provider'
import { useAuthStore } from '@/stores/auth-store'
import { buildAdminNavGroups } from '@/lib/admin-nav'
import { canSeeNavItem } from '@/lib/nav-permissions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import type { NavGroup as NavGroupType, NavItem, NavLink } from './types'

/** 未登录或无权限列表时使用同一引用，避免 `useMemo` 依赖在每次渲染间变化。 */
const EMPTY_PERMISSION_KEYS: string[] = []

function filterNavGroups(
  groups: NavGroupType[],
  permissionKeys: string[]
): NavGroupType[] {
  const result: NavGroupType[] = []
  for (const group of groups) {
    const items: NavItem[] = []
    for (const item of group.items) {
      if ('items' in item && item.items) {
        const subs = item.items.filter((sub) =>
          canSeeNavItem(permissionKeys, sub.anyOfPermissions)
        )
        if (subs.length === 0) {
          continue
        }
        items.push({ ...item, items: subs })
        continue
      }
      const link = item as NavLink
      if (canSeeNavItem(permissionKeys, link.anyOfPermissions)) {
        items.push(link)
      }
    }
    if (items.length > 0) {
      result.push({ ...group, items })
    }
  }
  return result
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const authUser = useAuthStore((s) => s.auth.user)
  const permissionKeys = authUser?.permissionKeys ?? EMPTY_PERMISSION_KEYS
  const navigationQuery = useQuery({
    queryKey: ['admin', 'auth', 'navigation'],
    queryFn: getAdminNavigation,
    staleTime: 60_000,
  })

  const fallbackNavGroups = useMemo(
    () => filterNavGroups(sidebarData.navGroups, permissionKeys),
    [permissionKeys]
  )
  const runtimeNav = useMemo(() => {
    if (!navigationQuery.data) {
      return null
    }

    return {
      navGroups: buildAdminNavGroups({
        menus: navigationQuery.data.menus,
      }).navGroups,
      warnings: navigationQuery.data.warnings,
    }
  }, [navigationQuery.data])
  const navGroups = runtimeNav?.navGroups ?? fallbackNavGroups

  useEffect(() => {
    for (const warning of runtimeNav?.warnings ?? []) {
      // eslint-disable-next-line no-console
      console.warn(`[admin-nav] ${warning}`)
    }
  }, [runtimeNav?.warnings])

  const navUser = authUser
    ? {
        name: authUser.displayName,
        email: authUser.username,
        avatar: sidebarData.user.avatar,
      }
    : sidebarData.user

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
