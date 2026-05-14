import { type ColumnDef } from '@tanstack/react-table'
import type { SeriesListItem } from '@contracts/admin/series'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

export const seriesColumns: ColumnDef<SeriesListItem>[] = [
  {
    accessorKey: 'seriesNo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='系列编号' />
    ),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('seriesNo')}</div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='系列名称' />
    ),
    meta: { className: 'w-50' },
    cell: ({ row }) => <div>{row.getValue('name')}</div>,
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
          {toSeriesStatusLabel(status)}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='系列描述' />
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
      <DataTableColumnHeader column={column} title='创建时间' />
    ),
    cell: ({ row }) => formatTimestamp(row.getValue('createdAt')),
  },
]

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
