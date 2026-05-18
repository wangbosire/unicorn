'use client'

import { Children, useMemo, useState, type ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ProCard, type ProCardProps } from './card'

const queryFilterSpanClassNames = {
  1: 'xl:col-span-1',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
} as const

export type ProQueryFilterItemProps = React.ComponentProps<'div'> & {
  /** 字段标签。 */
  label?: ReactNode
  /** 字段说明。 */
  description?: ReactNode
  /** 头部右侧补充内容。 */
  extra?: ReactNode
  /** 在四列栅格中的跨列数。 */
  span?: keyof typeof queryFilterSpanClassNames
}

/**
 * 查询表单单元。
 * 仅负责排版，不绑定具体表单库。
 */
export function ProQueryFilterItem({
  label,
  description,
  extra,
  span = 1,
  className,
  children,
  ...props
}: ProQueryFilterItemProps) {
  return (
    <div
      className={cn(
        'space-y-2',
        'md:col-span-1',
        queryFilterSpanClassNames[span],
        className
      )}
      {...props}
    >
      {label != null || extra != null ? (
        <div className='flex items-center justify-between gap-3'>
          {label != null ? (
            <Label className='text-sm font-medium text-foreground'>
              {label}
            </Label>
          ) : (
            <span />
          )}
          {extra ? (
            <div className='text-xs text-muted-foreground'>{extra}</div>
          ) : null}
        </div>
      ) : null}
      {children}
      {description ? (
        <p className='text-xs leading-5 text-muted-foreground'>{description}</p>
      ) : null}
    </div>
  )
}

export type ProQueryFilterProps = Omit<ProCardProps, 'children' | 'footer'> & {
  /** 查询区字段。 */
  children: ReactNode
  /** form 提交处理。 */
  onSubmit?: React.FormEventHandler<HTMLFormElement>
  /** 重置处理。 */
  onReset?: () => void
  /** 是否展示默认提交按钮组。 */
  submitter?: boolean
  /** 提交按钮文案。 */
  submitText?: ReactNode
  /** 重置按钮文案。 */
  resetText?: ReactNode
  /** 默认折叠时展示的字段数。 */
  defaultVisibleCount?: number
  /** 初始是否折叠。 */
  defaultCollapsed?: boolean
  /** 自定义操作区。 */
  actions?: ReactNode
}

/**
 * 查询筛选区。
 * 参考 antd pro 的 QueryFilter，但只保留后台最常用的筛选、提交、重置和折叠能力。
 */
export function ProQueryFilter({
  children,
  onSubmit,
  onReset,
  submitter = true,
  submitText = '查询',
  resetText = '重置',
  defaultVisibleCount = 4,
  defaultCollapsed = true,
  actions,
  contentClassName,
  ...props
}: ProQueryFilterProps) {
  const childArray = useMemo(() => Children.toArray(children), [children])
  const collapsible = childArray.length > defaultVisibleCount
  const [collapsed, setCollapsed] = useState(
    collapsible ? defaultCollapsed : false
  )

  const visibleChildren =
    collapsed && collapsible
      ? childArray.slice(0, defaultVisibleCount)
      : childArray

  return (
    <ProCard
      {...props}
      contentClassName={cn('space-y-4 px-4 py-4 md:px-5', contentClassName)}
    >
      <form
        className='space-y-4'
        onSubmit={(event) => {
          onSubmit?.(event)
        }}
      >
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {visibleChildren}
        </div>

        <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            {submitter ? (
              <>
                <Button type='submit'>{submitText}</Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    onReset?.()
                  }}
                >
                  {resetText}
                </Button>
              </>
            ) : null}
            {actions}
          </div>

          {collapsible ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? '展开更多' : '收起筛选'}
              {collapsed ? (
                <ChevronDownIcon data-icon='inline-end' className='size-4' />
              ) : (
                <ChevronUpIcon data-icon='inline-end' className='size-4' />
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </ProCard>
  )
}

export { ProQueryFilter as QueryFilter }
