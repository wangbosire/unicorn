import type { ComponentProps, ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { resolveSidebarBreadcrumbFromPath } from '@/lib/nav-breadcrumb'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type MainPassthrough = Pick<
  ComponentProps<typeof Main>,
  'fixed' | 'fluid' | 'className'
>

export type PageLayoutProps = MainPassthrough & {
  children: ReactNode
  /**
   * 顶栏左侧面包屑；不传时由当前路由 pathname 匹配 `sidebar-data` 菜单自动生成
   *（格式：`分组标题 / 菜单标题`）。
   */
  breadcrumb?: ReactNode
}

/**
 * 后台业务页通用外壳：顶栏（面包屑 + 全局搜索 + 主题 + 用户菜单）+ 主内容区。
 * 与 Chats / Settings / Apps 等模板页（顶栏含 ConfigDrawer 或不同布局）区分使用。
 */
export function PageLayout({
  breadcrumb,
  children,
  className,
  fixed,
  fluid,
}: PageLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const autoBreadcrumb = resolveSidebarBreadcrumbFromPath(pathname)

  return (
    <>
      <Header>
        <div className='me-auto'>
          {breadcrumb ?? (
            <PageLayoutBreadcrumb>{autoBreadcrumb}</PageLayoutBreadcrumb>
          )}
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>
      <Main className={className} fixed={fixed} fluid={fluid}>
        {children}
      </Main>
    </>
  )
}

/** 顶栏面包屑常用排版（小号次要色正文）。 */
export function PageLayoutBreadcrumb({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
  )
}
