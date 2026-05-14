import { type ColumnDef } from '@tanstack/react-table'
import type { ActivationCodeListItem } from '@contracts/admin/activation-codes'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

export const activationCodesColumns: ColumnDef<ActivationCodeListItem>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='激活码' />
    ),
    cell: ({ row }) => <div className='font-medium'>{row.getValue('code')}</div>,
    enableHiding: false,
  },
  {
    accessorKey: 'batchName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='所属批次' />
    ),
    cell: ({ row }) => row.getValue('batchName'),
    enableSorting: false,
  },
  {
    accessorKey: 'collectionNo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='对应藏品' />
    ),
    cell: ({ row }) => row.getValue('collectionNo'),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='状态' />
    ),
    cell: ({ row }) => {
      const status = String(row.getValue('status'))

      return (
        <Badge variant={status === 'UNISSUED' ? 'secondary' : 'default'}>
          {toActivationCodeStatusLabel(status)}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'expiredAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='失效时间' />
    ),
    cell: ({ row }) => {
      const value = row.getValue('expiredAt')
      return value ? formatTimestamp(Number(value)) : '-'
    },
  },
]

function toActivationCodeStatusLabel(status: string): string {
  switch (status) {
    case 'UNISSUED':
      return '未发放'
    case 'ISSUED':
      return '已发放'
    case 'USED':
      return '已使用'
    case 'VOIDED':
      return '已作废'
    case 'EXPIRED':
      return '已过期'
    default:
      return status
  }
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
