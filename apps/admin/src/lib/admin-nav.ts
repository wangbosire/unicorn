import type { AdminNavigationMenuItem } from '@contracts/admin/auth'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BookOpenText,
  Boxes,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  MessageSquareMore,
  ScanSearch,
  ScrollText,
  Shield,
  SquareTerminal,
  Tags,
  Users,
} from 'lucide-react'
import {
  type NavCollapsible,
  type NavGroup,
  type NavItem,
  type NavLink,
} from '@/components/layout/types'

const MENU_ICON_MAP: Record<string, LucideIcon> = {
  Bell,
  BookOpenText,
  Boxes,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  MessageSquareMore,
  ScanSearch,
  ScrollText,
  Shield,
  SquareTerminal,
  Tags,
  Users,
}

type BuildAdminNavGroupsParams = {
  menus: AdminNavigationMenuItem[]
}

type BuildAdminNavGroupsResult = {
  navGroups: NavGroup[]
}

function getMenuIcon(iconName: string | null): LucideIcon | undefined {
  if (!iconName) {
    return undefined
  }
  return MENU_ICON_MAP[iconName]
}

function toRootGroupTitle(menu: AdminNavigationMenuItem): string {
  if (menu.menuKey === 'dashboard') {
    return '总览'
  }
  return menu.menuName
}

function buildNavLink(menu: AdminNavigationMenuItem): NavLink | null {
  if (!menu.routePath) {
    return null
  }

  return {
    title: menu.menuName,
    url: menu.routePath,
    icon: getMenuIcon(menu.iconName),
  }
}

function buildVisibleNavItem(params: {
  menu: AdminNavigationMenuItem
  itemsByParentId: Map<string | null, AdminNavigationMenuItem[]>
}): NavItem | null {
  const { menu, itemsByParentId } = params
  const childMenus = itemsByParentId.get(menu.menuId) ?? []
  const visibleChildItems = childMenus
    .map((child) =>
      buildVisibleNavItem({
        menu: child,
        itemsByParentId,
      })
    )
    .filter((item): item is NavItem => Boolean(item))

  if (menu.menuType === 'DIRECTORY') {
    if (visibleChildItems.length === 0) {
      return null
    }

    return {
      title: menu.menuName,
      icon: getMenuIcon(menu.iconName),
      items: visibleChildItems
        .filter((item): item is NavLink => 'url' in item)
        .map((item) => ({
          title: item.title,
          url: item.url,
          icon: item.icon,
          badge: item.badge,
        })),
    } satisfies NavCollapsible
  }

  return buildNavLink(menu)
}

export function buildAdminNavGroups(
  params: BuildAdminNavGroupsParams
): BuildAdminNavGroupsResult {
  const menus = [...params.menus].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }
    return left.menuKey.localeCompare(right.menuKey)
  })
  const menuById = new Map(menus.map((menu) => [menu.menuId, menu]))
  const itemsByParentId = new Map<string | null, AdminNavigationMenuItem[]>()

  for (const menu of menus) {
    const current = itemsByParentId.get(menu.parentId ?? null) ?? []
    current.push(menu)
    itemsByParentId.set(menu.parentId ?? null, current)
  }

  const rootMenus = (itemsByParentId.get(null) ?? []).filter((menu) => {
    return !menu.parentId || !menuById.has(menu.parentId)
  })

  const navGroups: NavGroup[] = []
  for (const rootMenu of rootMenus) {
    if (rootMenu.menuType === 'DIRECTORY') {
      const items = (itemsByParentId.get(rootMenu.menuId) ?? [])
        .map((menu) =>
          buildVisibleNavItem({
            menu,
            itemsByParentId,
          })
        )
        .filter((item): item is NavItem => Boolean(item))

      if (items.length === 0) {
        continue
      }

      navGroups.push({
        title: toRootGroupTitle(rootMenu),
        items,
      })
      continue
    }

    const rootItem = buildVisibleNavItem({
      menu: rootMenu,
      itemsByParentId,
    })
    if (!rootItem) {
      continue
    }

    navGroups.push({
      title: toRootGroupTitle(rootMenu),
      items: [rootItem],
    })
  }

  return {
    navGroups,
  }
}
