import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type ColumnDef } from '@tanstack/react-table'
import type { IssuanceBatchListItem } from '@contracts/admin/issuance-batches'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type BatchesTableActions = {
  actionsDisabled: boolean
  onEditBatch: (row: IssuanceBatchListItem) => void
  onSetBatchStatus: (
    row: IssuanceBatchListItem,
    status: 'ENABLED' | 'DISABLED'
  ) => void
}

/**
 * 构建发行批次列表列定义；操作列支持编辑与启用 / 停用。
 */
export function createBatchesColumns(
  actions: BatchesTableActions
): ColumnDef<IssuanceBatchListItem>[] {
  return [
    {
      accessorKey: 'batchNo',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='批次编号' />
      ),
      cell: ({ row }) => <div className='font-medium'>{row.getValue('batchNo')}</div>,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='批次名称' />
      ),
      cell: ({ row }) => row.getValue('name'),
    },
    {
      accessorKey: 'seriesName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='所属系列' />
      ),
      cell: ({ row }) => row.getValue('seriesName'),
      enableSorting: false,
    },
    {
      accessorKey: 'seriesStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='系列状态' />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const seriesStatus = String(row.getValue('seriesStatus'))

        return (
          <Badge variant={seriesStatus === 'ENABLED' ? 'default' : 'secondary'}>
            {seriesStatus === 'ENABLED'
              ? '启用'
              : seriesStatus === 'DISABLED'
                ? '停用'
                : seriesStatus}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='发行数量' />
      ),
      cell: ({ row }) => row.getValue('quantity'),
    },
    {
      accessorKey: 'activateValidFrom',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='激活有效期' />
      ),
      enableSorting: false,
      meta: { className: 'w-70' },
      cell: ({ row }) =>
        `${formatTimestamp(row.original.activateValidFrom)} - ${formatTimestamp(
          row.original.activateValidTo
        )}`,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = String(row.getValue('status'))

        return (
          <Badge variant={status === 'ENABLED' ? 'default' : 'secondary'}>
            {status === 'ENABLED' ? '启用' : status === 'DISABLED' ? '停用' : status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
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
                  actions.onEditBatch(item)
                }}
              >
                编辑批次
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isEnabled ? (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => {
                    actions.onSetBatchStatus(item, 'DISABLED')
                  }}
                >
                  停用批次
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    actions.onSetBatchStatus(item, 'ENABLED')
                  }}
                >
                  启用批次
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

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}
