import { useMemo, type ReactNode } from 'react'
import type { IssuanceBatchListItem } from '@contracts/admin/issuance-batches'
import { ProTable } from '@/components/pro'
import { createBatchesColumns } from './batches-columns'

type BatchesTableProps = {
  data: IssuanceBatchListItem[]
  actionsDisabled: boolean
  canCreateBatch: boolean
  canEditBatch: boolean
  canToggleBatchStatus: boolean
  onEditBatch: (row: IssuanceBatchListItem) => void
  onSetBatchStatus: (
    row: IssuanceBatchListItem,
    status: 'ENABLED' | 'DISABLED'
  ) => void
  toolbarActions?: ReactNode
  totalCount?: number
}

export function BatchesTable({
  data,
  actionsDisabled,
  canCreateBatch,
  canEditBatch,
  canToggleBatchStatus,
  onEditBatch,
  onSetBatchStatus,
  toolbarActions,
  totalCount,
}: BatchesTableProps) {
  const columns = useMemo(
    () =>
      createBatchesColumns({
        actionsDisabled,
        canEditBatch,
        canToggleBatchStatus,
        onEditBatch,
        onSetBatchStatus,
      }),
    [
      actionsDisabled,
      canEditBatch,
      canToggleBatchStatus,
      onEditBatch,
      onSetBatchStatus,
    ]
  )

  return (
    <ProTable
      variant='plain'
      title='批次列表'
      description={
        <>
          当前共 {totalCount ?? data.length} 个批次。列表筛选、排序和字段显隐统一走 ProTable 组件。
        </>
      }
      columns={columns}
      data={data}
      search={{
        placeholder: '搜索批次编号、批次名称或所属系列。',
        globalFilterFn: (row, _columnId, filterValue) => {
          const keyword = String(filterValue).toLowerCase()
          const item = row.original

          return [item.batchNo, item.name, item.seriesName].some((field) =>
            field.toLowerCase().includes(keyword)
          )
        },
      }}
      filters={[
        {
          columnId: 'status',
          title: '状态',
          options: [
            { label: '启用', value: 'ENABLED' },
            { label: '停用', value: 'DISABLED' },
          ],
        },
      ]}
      actions={canCreateBatch ? toolbarActions : undefined}
      emptyTitle='暂无批次数据'
      emptyDescription='可以尝试放宽搜索关键词或切换状态筛选后再查看。'
      pagination={{
        mode: 'client',
        pageSize: 10,
        total: totalCount,
        pageSizeOptions: [10, 20],
      }}
    />
  )
}
