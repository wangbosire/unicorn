import { sidebarData } from '@/components/layout/data/sidebar-data'
import type { NavCollapsible, NavLink } from '@/components/layout/types'

/** 统一去掉末尾 `/`，根路径规范为 `/`。 */
function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/'
}

function pathMatches(pathname: string, url: string | undefined): boolean {
  if (url === undefined || url === '') {
    return false
  }
  return normalizePath(pathname) === normalizePath(String(url))
}

/**
 * 顶栏面包屑与侧边栏 `sidebar-data` 的 `url` 一致；新增路由时请在菜单中配置对应项。
 *
 * 根据当前路径在侧边栏配置中解析文案：
 * - 普通链接：`分组标题 / 菜单标题`
 * - 折叠父级下的子链：`分组标题 / 父菜单标题 / 子菜单标题`
 * - 未命中时：用路径段拼接；根路径兜底为 `总览 / 仪表盘`。
 */
export function resolveSidebarBreadcrumbFromPath(pathname: string): string {
  const p = normalizePath(pathname)

  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if ('items' in item && item.items) {
        const collapsible = item as NavCollapsible
        for (const sub of collapsible.items) {
          if (pathMatches(p, String(sub.url))) {
            return `${group.title} / ${collapsible.title} / ${sub.title}`
          }
        }
      } else {
        const link = item as NavLink
        if (pathMatches(p, String(link.url))) {
          return `${group.title} / ${link.title}`
        }
      }
    }
  }

  const segments = p.replace(/^\//, '').split('/').filter(Boolean)
  return segments.length > 0 ? segments.join(' / ') : '总览 / 仪表盘'
}
