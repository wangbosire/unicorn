import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type ColumnDef } from '@tanstack/react-table'
import type { AdminMemberListItem } from '@contracts/admin/members'
import { ProTableColumnHeader } from '@/components/pro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type MembersTableActions = {
  /** 为 true 时禁用行内菜单，避免并发写冲突。 */
  actionsDisabled: boolean
  canManageStatus: boolean
  onRequestFreeze: (row: AdminMemberListItem) => void
  onRequestUnfreeze: (row: AdminMemberListItem) => void
}

/**
 * 构建会员列表列定义；操作列通过下拉菜单与发行区系列列表对齐。
 */
export function createMembersColumns(
  actions: MembersTableActions
): ColumnDef<AdminMemberListItem>[] {
  return [
    {
      accessorKey: 'memberNo',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='会员编号' />
      ),
      cell: ({ row }) => (
        <div className='font-mono text-xs'>{row.getValue('memberNo')}</div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'nickname',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='昵称' />
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('nickname')}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'mobile',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='手机号' />
      ),
      cell: ({ row }) => {
        const v = row.getValue('mobile') as string | null
        return (
          <div className='text-muted-foreground text-sm'>
            {v?.trim() ? v : '—'}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = String(row.getValue('status'))
        return (
          <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {toMemberStatusLabel(status)}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'wechatChannelsSummary',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='微信渠道' />
      ),
      cell: ({ row }) => {
        const v = row.getValue('wechatChannelsSummary') as string | null
        return (
          <div className='text-muted-foreground text-sm'>{v?.trim() ? v : '—'}</div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'ownedCollectionsCount',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='藏品数' />
      ),
      meta: { className: 'text-end tabular-nums', thClassName: 'text-end' },
      cell: ({ row }) => (
        <div className='text-end tabular-nums'>
          {row.getValue('ownedCollectionsCount')}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'registeredAt',
      header: ({ column }) => (
        <ProTableColumnHeader column={column} title='注册时间' />
      ),
      cell: ({ row }) => (
        <div className='text-muted-foreground text-sm tabular-nums'>
          {formatRegisteredAt(Number(row.getValue('registeredAt')))}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>操作</span>,
      cell: ({ row }) => {
        const item = row.original
        const isActive = item.status === 'ACTIVE'
        const isFrozen = item.status === 'FROZEN'

        if (!actions.canManageStatus) {
          return null
        }

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
              {isActive ? (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => {
                    actions.onRequestFreeze(item)
                  }}
                >
                  冻结会员
                </DropdownMenuItem>
              ) : null}
              {isFrozen ? (
                <DropdownMenuItem
                  onClick={() => {
                    actions.onRequestUnfreeze(item)
                  }}
                >
                  解冻会员
                </DropdownMenuItem>
              ) : null}
              {!isActive && !isFrozen ? (
                <DropdownMenuItem disabled>暂无可执行操作</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

function toMemberStatusLabel(status: string): string {
  if (status === 'ACTIVE') return '正常'
  if (status === 'FROZEN') return '冻结'
  return status
}

function formatRegisteredAt(ms: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return String(ms)
  }
}
