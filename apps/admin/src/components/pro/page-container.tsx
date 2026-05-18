import type { ReactNode } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * 页面级标签页配置。
 * 适用于后台业务页在同一语义域下切换不同列表或视图。
 */
export type ProPageTabItem = {
  /** 标签页唯一标识。 */
  key: string
  /** 标签页展示文案。 */
  label: ReactNode
  /** 右上角补充计数或状态。 */
  badge?: ReactNode
  /** 是否禁用当前页签。 */
  disabled?: boolean
}

/**
 * 页面头部面包屑项。
 */
export type ProPageBreadcrumbItem = {
  /** 面包屑唯一 key。 */
  key?: string
  /** 当前层级展示内容。 */
  label: ReactNode
}

export type ProPageContainerProps = React.ComponentProps<'section'> & {
  /** 页面主标题。 */
  title: ReactNode
  /** 标题下方的简短说明。 */
  subtitle?: ReactNode
  /** 头部附加说明，可用于接口描述或业务提示。 */
  description?: ReactNode
  /** 标题右侧操作区，常放创建按钮、导出按钮等。 */
  extra?: ReactNode
  /** 标题下方标签区，可放状态标签或环境标识。 */
  tags?: ReactNode
  /** 自定义面包屑，未传时不展示。 */
  breadcrumb?: ReactNode | ProPageBreadcrumbItem[]
  /** 页面底部补充区。 */
  footer?: ReactNode
  /** 头部下方页签。 */
  tabs?: ProPageTabItem[]
  /** 当前激活页签 key。 */
  tabActiveKey?: string
  /** 页签切换回调。 */
  onTabChange?: (key: string) => void
  /** 头部容器的附加 className。 */
  headerClassName?: string
  /** 内容区容器的附加 className。 */
  bodyClassName?: string
}

function renderBreadcrumb(
  breadcrumb: ProPageContainerProps['breadcrumb']
): ReactNode {
  if (breadcrumb == null) {
    return null
  }

  if (!Array.isArray(breadcrumb)) {
    return breadcrumb
  }

  if (breadcrumb.length === 0) {
    return null
  }

  return (
    <div className='flex flex-wrap items-center gap-1 text-sm text-muted-foreground'>
      {breadcrumb.map((item, index) => (
        <div key={item.key ?? `${index}`} className='flex items-center gap-1'>
          {index > 0 ? <ChevronRightIcon className='size-3.5 opacity-60' /> : null}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * shadcn 风格的后台页面头部容器。
 * 对齐 antd pro 的 PageContainer 心智，但保持当前仓库的轻量结构。
 */
export function ProPageContainer({
  title,
  subtitle,
  description,
  extra,
  tags,
  breadcrumb,
  footer,
  tabs,
  tabActiveKey,
  onTabChange,
  headerClassName,
  bodyClassName,
  className,
  children,
  ...props
}: ProPageContainerProps) {
  const hasHeaderMeta =
    breadcrumb != null ||
    subtitle != null ||
    description != null ||
    tags != null ||
    extra != null ||
    (tabs != null && tabs.length > 0)

  return (
    <section className={cn('space-y-6', className)} {...props}>
      <Card className={cn('overflow-hidden rounded-2xl border shadow-sm', headerClassName)}>
        <CardContent className='space-y-5 px-5 py-5 md:px-6'>
          {hasHeaderMeta ? renderBreadcrumb(breadcrumb) : null}

          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='min-w-0 space-y-3'>
              <div className='space-y-1'>
                <h1 className='text-2xl font-semibold tracking-tight text-foreground md:text-3xl'>
                  {title}
                </h1>
                {subtitle ? (
                  <p className='text-base text-muted-foreground'>{subtitle}</p>
                ) : null}
              </div>

              {tags ? <div className='flex flex-wrap gap-2'>{tags}</div> : null}

              {description ? (
                <div className='max-w-4xl text-sm leading-6 text-muted-foreground'>
                  {description}
                </div>
              ) : null}
            </div>

            {extra ? (
              <div className='flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end'>
                {extra}
              </div>
            ) : null}
          </div>

          {tabs != null && tabs.length > 0 ? (
            <>
              <Separator />
              <Tabs
                value={tabActiveKey ?? tabs[0]?.key}
                onValueChange={onTabChange}
                className='gap-0'
              >
                <TabsList variant='line' className='h-auto flex-wrap justify-start gap-2 p-0'>
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      disabled={tab.disabled}
                      className='gap-2 rounded-lg px-3 py-2 data-active:bg-muted/60'
                    >
                      <span>{tab.label}</span>
                      {tab.badge != null ? (
                        typeof tab.badge === 'string' || typeof tab.badge === 'number' ? (
                          <Badge variant='secondary'>{tab.badge}</Badge>
                        ) : (
                          tab.badge
                        )
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className={cn('space-y-6', bodyClassName)}>{children}</div>

      {footer ? <div>{footer}</div> : null}
    </section>
  )
}

export { ProPageContainer as PageContainer }
