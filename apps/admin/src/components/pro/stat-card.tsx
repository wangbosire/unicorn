import type { ReactNode } from 'react'
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ProCard, type ProCardProps } from './card'

type ProStatTrendStatus = 'up' | 'down' | 'flat'

export type ProStatCardProps = Omit<ProCardProps, 'title' | 'description'> & {
  /** 指标标题。 */
  title: ReactNode
  /** 核心指标值。 */
  value: ReactNode
  /** 指标副说明。 */
  description?: ReactNode
  /** 指标图标。 */
  icon?: ReactNode
  /** 趋势状态。 */
  trend?: ProStatTrendStatus
  /** 趋势文案。 */
  trendLabel?: ReactNode
  /** 底部补充说明。 */
  footerNote?: ReactNode
  /** 数值样式。 */
  valueClassName?: string
}

const trendStyles: Record<
  ProStatTrendStatus,
  { className: string; icon: ReactNode }
> = {
  up: {
    className: 'text-emerald-600 dark:text-emerald-400',
    icon: <ArrowUpRightIcon className='size-3.5' />,
  },
  down: {
    className: 'text-destructive',
    icon: <ArrowDownRightIcon className='size-3.5' />,
  },
  flat: {
    className: 'text-muted-foreground',
    icon: <ArrowRightIcon className='size-3.5' />,
  },
}

/**
 * 指标卡片，参考 antd pro 的 StatisticCard 心智。
 */
export function ProStatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
  footerNote,
  valueClassName,
  children,
  ...props
}: ProStatCardProps) {
  const trendMeta = trend ? trendStyles[trend] : null

  return (
    <ProCard
      {...props}
      contentClassName='space-y-4 px-4 py-4 md:px-5'
      borderedHeader={false}
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <div className='text-sm font-medium text-muted-foreground'>{title}</div>
          <div className={cn('text-3xl font-semibold tracking-tight', valueClassName)}>
            {value}
          </div>
        </div>
        {icon ? (
          <div className='flex size-10 items-center justify-center rounded-xl bg-muted text-foreground'>
            {icon}
          </div>
        ) : null}
      </div>

      {description ? (
        <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
      ) : null}

      {trendMeta != null || footerNote != null ? (
        <div className='flex flex-wrap items-center gap-2'>
          {trendMeta != null && trendLabel != null ? (
            <Badge variant='outline' className={cn('gap-1 rounded-full', trendMeta.className)}>
              {trendMeta.icon}
              <span>{trendLabel}</span>
            </Badge>
          ) : null}
          {footerNote ? (
            <span className='text-xs text-muted-foreground'>{footerNote}</span>
          ) : null}
        </div>
      ) : null}

      {children}
    </ProCard>
  )
}

export { ProStatCard as StatisticCard }
