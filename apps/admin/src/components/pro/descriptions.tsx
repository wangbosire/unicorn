import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ProCard, type ProCardProps } from './card'

export type ProDescriptionsItem = {
  /** 当前描述项唯一 key。 */
  key: string
  /** 标签名。 */
  label: ReactNode
  /** 展示值。 */
  value?: ReactNode
  /** 未传 value 时直接渲染 children。 */
  children?: ReactNode
  /** 补充说明。 */
  extra?: ReactNode
  /** 当前项跨列数。 */
  span?: 1 | 2 | 3 | 4
  /** 空值兜底文案。 */
  emptyText?: ReactNode
}

export type ProDescriptionsProps = Omit<ProCardProps, 'children'> & {
  /** 描述项列表。 */
  items: ProDescriptionsItem[]
  /** 桌面端列数。 */
  columns?: 1 | 2 | 3 | 4
  /** 是否显示边框分割。 */
  bordered?: boolean
}

/**
 * 详情描述组件，适合后台详情页、审核页和只读信息区。
 */
export function ProDescriptions({
  items,
  columns = 2,
  bordered = true,
  contentClassName,
  ...props
}: ProDescriptionsProps) {
  return (
    <ProCard
      {...props}
      contentClassName={cn('px-4 py-4 md:px-5', contentClassName)}
    >
      <div
        className='grid gap-4'
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const content = item.children ?? item.value ?? item.emptyText ?? '--'
          return (
            <div
              key={item.key}
              className={cn(
                'space-y-2 rounded-xl p-3',
                bordered ? 'border bg-muted/20' : 'border border-transparent px-0 py-0'
              )}
              style={{
                gridColumn: `span ${Math.min(item.span ?? 1, columns)} / span ${Math.min(
                  item.span ?? 1,
                  columns
                )}`,
              }}
            >
              <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                <span>{item.label}</span>
                {item.extra ? (
                  typeof item.extra === 'string' || typeof item.extra === 'number' ? (
                    <Badge variant='secondary'>{item.extra}</Badge>
                  ) : (
                    item.extra
                  )
                ) : null}
              </div>
              <div className='text-sm leading-6 text-foreground'>{content}</div>
            </div>
          )
        })}
      </div>
    </ProCard>
  )
}
