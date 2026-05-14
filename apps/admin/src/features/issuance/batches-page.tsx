import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateIssuanceBatchRequest,
} from '@contracts/admin/issuance-batches'
import type { SeriesListItem } from '@contracts/admin/series'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createIssuanceBatch,
  listIssuanceBatches,
} from '@/apis/issuance/batches'
import { listSeries } from '@/apis/issuance/series'
import { ApiError } from '@/lib/api-error'
import { BatchesTable } from './components/batches-table'
import { CreateBatchDialog } from './components/create-batch-dialog'

export function BatchesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [seriesId, setSeriesId] = useState('')
  const [batchName, setBatchName] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [activateValidFrom, setActivateValidFrom] = useState('2026-05-14T00:00')
  const [activateValidTo, setActivateValidTo] = useState('2026-06-14T23:59')
  const [remark, setRemark] = useState('')
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'issuance-batches'],
    queryFn: () =>
      listIssuanceBatches({
        page: 1,
        pageSize: 20,
      }),
  })
  const { data: seriesData } = useQuery({
    queryKey: ['admin', 'series', 'enabled-options'],
    queryFn: () =>
      listSeries({
        page: 1,
        pageSize: 100,
      }),
  })
  const seriesOptions = useMemo(
    () => (seriesData?.items ?? []).filter((item) => item.status === 'ENABLED'),
    [seriesData]
  )
  const createIssuanceBatchMutation = useMutation({
    mutationFn: (payload: CreateIssuanceBatchRequest) => createIssuanceBatch(payload),
    onSuccess: async (createdBatch) => {
      toast.success(`批次 ${createdBatch.name} 创建成功`)
      setIsCreateDialogOpen(false)
      const resetValues = buildDefaultBatchFormState(seriesOptions)
      setSeriesId(resetValues.seriesId)
      setBatchName(resetValues.batchName)
      setQuantity(resetValues.quantity)
      setActivateValidFrom(resetValues.activateValidFrom)
      setActivateValidTo(resetValues.activateValidTo)
      setRemark(resetValues.remark)
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapCreateBatchErrorMessage(error))
        return
      }

      toast.error('批次创建失败，请稍后重试')
    },
  })

  function handleOpenCreateDialog(open: boolean) {
    setIsCreateDialogOpen(open)

    if (open && !seriesId && seriesOptions[0]) {
      setSeriesId(seriesOptions[0].id)
    }
  }

  function handleCreateBatch() {
    const parsedQuantity = Number(quantity)
    const payload = {
      seriesId,
      name: batchName.trim(),
      quantity: parsedQuantity,
      activateValidFrom: new Date(activateValidFrom).toISOString(),
      activateValidTo: new Date(activateValidTo).toISOString(),
      remark: remark.trim() || undefined,
    } satisfies CreateIssuanceBatchRequest

    if (!payload.seriesId || !payload.name || !Number.isFinite(parsedQuantity)) {
      toast.error('请完整填写系列、批次名称和发行数量')
      return
    }

    createIssuanceBatchMutation.mutate(payload)
  }

  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>发行管理 / 发行批次</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>发行批次</h1>
            <p className='text-sm text-muted-foreground'>
              按系列定义每次具体发行的数量、状态和领取进度。
            </p>
          </div>
          <Button onClick={() => handleOpenCreateDialog(true)}>新增批次</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>批次列表</CardTitle>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个批次。列表筛选、排序和字段显隐统一走
              data-table 组件。
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='py-8 text-center text-muted-foreground'>
                正在加载批次数据...
              </div>
            ) : isError ? (
              <div className='py-8 text-center text-destructive'>
                批次数据加载失败，请稍后重试。
              </div>
            ) : (
              <BatchesTable data={data?.items ?? []} />
            )}
          </CardContent>
        </Card>
      </Main>

      <CreateBatchDialog
        open={isCreateDialogOpen}
        onOpenChange={handleOpenCreateDialog}
        seriesOptions={seriesOptions}
        seriesId={seriesId}
        onSeriesIdChange={setSeriesId}
        batchName={batchName}
        onBatchNameChange={setBatchName}
        quantity={quantity}
        onQuantityChange={setQuantity}
        activateValidFrom={activateValidFrom}
        onActivateValidFromChange={setActivateValidFrom}
        activateValidTo={activateValidTo}
        onActivateValidToChange={setActivateValidTo}
        remark={remark}
        onRemarkChange={setRemark}
        onSubmit={handleCreateBatch}
        mutation={createIssuanceBatchMutation}
      />
    </>
  )
}

/**
 * 重置批次创建表单，优先选中当前第一个可用系列。
 */
function buildDefaultBatchFormState(seriesOptions: SeriesListItem[]) {
  return {
    seriesId: seriesOptions[0]?.id ?? '',
    batchName: '',
    quantity: '100',
    activateValidFrom: '2026-05-14T00:00',
    activateValidTo: '2026-06-14T23:59',
    remark: '',
  }
}

/**
 * 将创建批次错误转换为更适合后台操作的提示。
 */
function mapCreateBatchErrorMessage(error: ApiError): string {
  if (error.code === 'SERIES_NOT_FOUND') {
    return '所选系列不存在，请刷新后重试'
  }

  if (error.code === 'SERIES_DISABLED') {
    return '所选系列已停用，请更换启用中的系列'
  }

  if (error.code === 'INVALID_ISSUANCE_BATCH_VALID_TIME_RANGE') {
    return '激活有效期不合法，请检查开始和结束时间'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '批次信息校验失败，请检查输入内容'
  }

  return error.message || '批次创建失败，请稍后重试'
}
