import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type ColumnDef } from '@tanstack/react-table'
import type { SeriesListItem } from '@contracts/admin/series'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProTableColumnHeader } from '@/components/pro'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type SeriesTableActions = {
  /** 为 true 时禁用行内操作按钮，避免并发写冲突。 */
  actionsDisabled: boolean
  onEdit: (row: SeriesListItem) => void
  onSetStatus: (row: SeriesListItem, status: 'ENABLED' | 'DISABLED') => void
}

/**
 * 构建系列列表列定义；操作列依赖页面注入的回调。
 */
export function createSeriesColumns(
  actions: SeriesTableActions
): ColumnDef<SeriesListItem>[] {
  return [
    {
      accessorKey: 'seriesNo',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='系列编号' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('seriesNo')}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='系列名称' />
      ),
      meta: { className: 'w-50' },
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = String(row.getValue('status'))

        return (
          <Badge variant={status === 'ENABLED' ? 'default' : 'secondary'}>
            {toSeriesStatusLabel(status)}
          </Badge>
        )
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='系列描述' />
      ),
      meta: { className: 'w-[40%]' },
      cell: ({ row }) => (
        <div className='truncate text-muted-foreground'>
          {row.getValue('description')}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='创建时间' />
      ),
      cell: ({ row }) => formatTimestamp(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>操作</span>,
      cell: ({ row }) => {
        const item = row.original
        const isEnabled = item.status === 'ENABLED'

        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
                disabled={actions.actionsDisabled}
              >
                <DotsHorizontalIcon className='h-4 w-4' />
                <span className='sr-only'>打开菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  actions.onEdit(item)
                }}
              >
                编辑信息
              </DropdownMenuItem>
              {isEnabled ? (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => {
                    actions.onSetStatus(item, 'DISABLED')
                  }}
                >
                  停用系列
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    actions.onSetStatus(item, 'ENABLED')
                  }}
                >
                  启用系列
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableHiding: false,
    },
  ]
}

function toSeriesStatusLabel(status: string): string {
  if (status === 'ENABLED') return '启用'
  if (status === 'DISABLED') return '停用'
  return status
}

function formatTimestamp(timestamp: unknown): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(Number(timestamp))
}
