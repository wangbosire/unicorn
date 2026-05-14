import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type ColumnDef } from '@tanstack/react-table'
import type { ActivationCodeListItem } from '@contracts/admin/activation-codes'
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

export type ActivationCodesTableActions = {
  actionsDisabled: boolean
  onVoidRequest: (row: ActivationCodeListItem) => void
}

function canVoidActivationCode(status: string): boolean {
  return status === 'UNISSUED' || status === 'ISSUED'
}

/**
 * 构建激活码列表列定义；操作列支持发起作废确认。
 */
export function createActivationCodesColumns(
  actions: ActivationCodesTableActions
): ColumnDef<ActivationCodeListItem>[] {
  return [
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
    {
      id: 'actions',
      header: () => <span className='sr-only'>操作</span>,
      cell: ({ row }) => {
        const item = row.original
        const voidable = canVoidActivationCode(item.status)

        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
                disabled={actions.actionsDisabled || !voidable}
              >
                <DotsHorizontalIcon className='h-4 w-4' />
                <span className='sr-only'>打开菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => {
                  actions.onVoidRequest(item)
                }}
              >
                作废激活码
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableHiding: false,
    },
  ]
}

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
