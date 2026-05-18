import { useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import type { AdminMemberListItem } from '@contracts/admin/members'
import { ProTable } from '@/components/pro'
import { createMembersColumns } from './members-columns'

type MembersTableProps = {
  data: AdminMemberListItem[]
  /** 接口返回的总条数（服务端分页）。 */
  total: number
  /** 当前页码（从 1 开始），与接口 `page` 一致。 */
  page: number
  pageSize: number
  onPaginationModelChange: (model: PaginationState) => void
  /** 列表行内写操作进行中时为 true，避免重复触发。 */
  actionsDisabled: boolean
  onRequestFreeze: (row: AdminMemberListItem) => void
  onRequestUnfreeze: (row: AdminMemberListItem) => void
}

/**
 * 会员列表表格：基于 ProTable 承接服务端分页结果。
 */
export function MembersTable({
  data,
  total,
  page,
  pageSize,
  onPaginationModelChange,
  actionsDisabled,
  onRequestFreeze,
  onRequestUnfreeze,
}: MembersTableProps) {
  const columns = useMemo(
    () =>
      createMembersColumns({
        actionsDisabled,
        onRequestFreeze,
        onRequestUnfreeze,
      }),
    [actionsDisabled, onRequestFreeze, onRequestUnfreeze]
  )

  return (
    <ProTable
      title='会员列表'
      description={`当前页展示 ${data.length} 条记录，接口总量 ${total} 条。`}
      columns={columns}
      data={data}
      emptyTitle='暂无符合条件的会员'
      emptyDescription='可以尝试放宽搜索关键词或切换状态筛选后再查看。'
      pagination={{
        mode: 'server',
        page,
        pageSize,
        total,
        pageSizeOptions: [10, 20, 50],
        onPageChange: (nextPage) => {
          onPaginationModelChange({ pageIndex: nextPage - 1, pageSize })
        },
        onPageSizeChange: (nextPageSize) => {
          onPaginationModelChange({ pageIndex: 0, pageSize: nextPageSize })
        },
      }}
    />
  )
}
