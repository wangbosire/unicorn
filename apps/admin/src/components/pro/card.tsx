import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const cardGroupColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
} as const

export type ProCardProps = React.ComponentProps<typeof Card> & {
  /** 卡片标题。 */
  title?: ReactNode
  /** 卡片说明。 */
  description?: ReactNode
  /** 头部右侧操作区。 */
  extra?: ReactNode
  /** 底部扩展区。 */
  footer?: ReactNode
  /** 内容区自定义 className。 */
  contentClassName?: string
  /** 头部是否展示底部分割线。 */
  borderedHeader?: boolean
  /** 加载态。 */
  loading?: boolean
  /** 加载文案。 */
  loadingText?: ReactNode
}

/**
 * Pro 风格内容卡片。
 * 常用于列表模块、信息模块和表单模块的承载壳子。
 */
export function ProCard({
  title,
  description,
  extra,
  footer,
  borderedHeader = true,
  contentClassName,
  loading = false,
  loadingText = '正在加载...',
  className,
  children,
  ...props
}: ProCardProps) {
  const hasHeader = title != null || description != null || extra != null

  return (
    <Card className={cn('rounded-2xl border shadow-sm', className)} {...props}>
      {hasHeader ? (
        <CardHeader className={cn(borderedHeader ? 'border-b' : undefined)}>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {extra ? <CardAction>{extra}</CardAction> : null}
        </CardHeader>
      ) : null}

      <CardContent className={cn('px-4 py-4 md:px-5', contentClassName)}>
        {loading ? (
          <div className='flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground'>
            <Spinner className='size-4' />
            <span>{loadingText}</span>
          </div>
        ) : (
          children
        )}
      </CardContent>

      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  )
}

export type ProCardGroupProps = React.ComponentProps<'div'> & {
  /** 同屏卡片列数。 */
  columns?: keyof typeof cardGroupColumns
}

/**
 * 用于同级卡片的响应式栅格容器。
 */
export function ProCardGroup({
  columns = 3,
  className,
  ...props
}: ProCardGroupProps) {
  return (
    <div
      className={cn('grid gap-4', cardGroupColumns[columns], className)}
      {...props}
    />
  )
}
