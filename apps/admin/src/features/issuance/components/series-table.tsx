import { useMemo, useState } from 'react'
import type { SeriesListItem } from '@contracts/admin/series'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProQueryFilter, ProQueryFilterItem, ProTable } from '@/components/pro'
import { createSeriesColumns } from './series-columns'

type SeriesTableProps = {
  data: SeriesListItem[]
  /** 列表行内写操作进行中时为 true，避免重复触发。 */
  actionsDisabled: boolean
  canCreateSeries: boolean
  canEditSeries: boolean
  canToggleSeriesStatus: boolean
  onEditSeries: (row: SeriesListItem) => void
  onSetSeriesStatus: (
    row: SeriesListItem,
    status: 'ENABLED' | 'DISABLED'
  ) => void
  onCreateSeries: () => void
  isLoading: boolean
}

export function SeriesTable({
  data,
  actionsDisabled,
  canCreateSeries,
  canEditSeries,
  canToggleSeriesStatus,
  onEditSeries,
  onSetSeriesStatus,
  onCreateSeries,
  isLoading,
}: SeriesTableProps) {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL')

  const columns = useMemo(
    () =>
      createSeriesColumns({
        actionsDisabled,
        canEdit: canEditSeries,
        canToggleStatus: canToggleSeriesStatus,
        onEdit: onEditSeries,
        onSetStatus: onSetSeriesStatus,
      }),
    [
      actionsDisabled,
      canEditSeries,
      canToggleSeriesStatus,
      onEditSeries,
      onSetSeriesStatus,
    ]
  )

  const filteredData = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return data.filter((item) => {
      const matchesStatus = status === 'ALL' ? true : item.status === status
      if (!matchesStatus) {
        return false
      }

      if (!normalizedKeyword) {
        return true
      }

      return [item.seriesNo, item.name, item.description].some((field) =>
        field.toLowerCase().includes(normalizedKeyword)
      )
    })
  }, [data, keyword, status])

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <ProQueryFilter
        defaultCollapsed={false}
        defaultVisibleCount={4}
        onSubmit={(event) => {
          event.preventDefault()
          setKeyword(keywordInput)
        }}
        onReset={() => {
          setKeywordInput('')
          setKeyword('')
          setStatus('ALL')
        }}
      >
        <ProQueryFilterItem label='关键字' span={2}>
          <Input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder='输入系列编号、名称或描述'
          />
        </ProQueryFilterItem>
        <ProQueryFilterItem label='状态'>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as 'ALL' | 'ENABLED' | 'DISABLED')
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='选择状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>全部状态</SelectItem>
              <SelectItem value='ENABLED'>启用</SelectItem>
              <SelectItem value='DISABLED'>停用</SelectItem>
            </SelectContent>
          </Select>
        </ProQueryFilterItem>
      </ProQueryFilter>

      <ProTable
        title='系列列表'
        columns={columns}
        data={filteredData}
        emptyTitle='暂无符合条件的系列'
        emptyDescription='可以尝试放宽关键字或切换状态条件后再查看。'
        extra={
          canCreateSeries ? (
            <Button size='sm' onClick={onCreateSeries}>
              新增系列
            </Button>
          ) : null
        }
        loading={isLoading}
        pagination={{
          mode: 'client',
          pageSize: 10,
          pageSizeOptions: [10, 20],
        }}
      />
    </div>
  )
}
