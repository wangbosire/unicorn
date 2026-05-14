import { type ColumnDef } from '@tanstack/react-table'
import type { IssuanceBatchListItem } from '@contracts/admin/issuance-batches'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

export const batchesColumns: ColumnDef<IssuanceBatchListItem>[] = [
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
]

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}
