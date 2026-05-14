import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateIssuanceBatchRequest,
  IssuanceBatchListItem,
  UpdateIssuanceBatchRequest,
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
  getIssuanceBatch,
  listIssuanceBatches,
  updateIssuanceBatch,
  updateIssuanceBatchStatus,
} from '@/apis/issuance/batches'
import { listSeries } from '@/apis/issuance/series'
import { ApiError } from '@/lib/api-error'
import { BatchesTable } from './components/batches-table'
import { CreateBatchDialog } from './components/create-batch-dialog'
import { EditBatchDialog } from './components/edit-batch-dialog'

export function BatchesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBatchRow, setEditingBatchRow] =
    useState<IssuanceBatchListItem | null>(null)
  const [editBatchName, setEditBatchName] = useState('')
  const [editQuantity, setEditQuantity] = useState('100')
  const [editActivateValidFrom, setEditActivateValidFrom] = useState('')
  const [editActivateValidTo, setEditActivateValidTo] = useState('')
  const [editRemark, setEditRemark] = useState('')
  const [isEditDetailLoading, setIsEditDetailLoading] = useState(false)
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
  const updateIssuanceBatchStatusMutation = useMutation({
    mutationFn: (variables: {
      batchId: string
      status: 'ENABLED' | 'DISABLED'
    }) =>
      updateIssuanceBatchStatus(variables.batchId, { status: variables.status }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === 'ENABLED' ? '批次已启用' : '批次已停用'
      )
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapUpdateBatchStatusErrorMessage(error))
        return
      }

      toast.error('批次状态更新失败，请稍后重试')
    },
  })
  const updateIssuanceBatchMutation = useMutation({
    mutationFn: (variables: {
      batchId: string
      payload: UpdateIssuanceBatchRequest
    }) => updateIssuanceBatch(variables.batchId, variables.payload),
    onSuccess: async () => {
      toast.success('批次信息已更新')
      setIsEditDialogOpen(false)
      setEditingBatchRow(null)
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches', 'detail'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapUpdateBatchErrorMessage(error))
        return
      }

      toast.error('批次更新失败，请稍后重试')
    },
  })

  const isBatchListMutating = useMemo(
    () =>
      createIssuanceBatchMutation.isPending ||
      updateIssuanceBatchStatusMutation.isPending ||
      updateIssuanceBatchMutation.isPending,
    [
      createIssuanceBatchMutation.isPending,
      updateIssuanceBatchStatusMutation.isPending,
      updateIssuanceBatchMutation.isPending,
    ]
  )

  const { mutate: mutateBatchStatus } = updateIssuanceBatchStatusMutation

  const handleSetBatchStatus = useCallback(
    (row: IssuanceBatchListItem, status: 'ENABLED' | 'DISABLED') => {
      mutateBatchStatus({ batchId: row.id, status })
    },
    [mutateBatchStatus]
  )

  const runEditBatch = useCallback(
    async (row: IssuanceBatchListItem) => {
      setEditBatchName(row.name)
      setEditQuantity(String(row.quantity))
      setEditActivateValidFrom(toDatetimeLocalInputValue(row.activateValidFrom))
      setEditActivateValidTo(toDatetimeLocalInputValue(row.activateValidTo))
      setEditRemark('')
      setEditingBatchRow(row)
      setIsEditDialogOpen(true)
      setIsEditDetailLoading(true)
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: ['admin', 'issuance-batches', 'detail', row.id],
          queryFn: () => getIssuanceBatch(row.id),
        })
        setEditRemark(detail.remark ?? '')
      } catch {
        toast.error('批次详情加载失败，请稍后重试')
        setIsEditDialogOpen(false)
        setEditingBatchRow(null)
      } finally {
        setIsEditDetailLoading(false)
      }
    },
    [queryClient]
  )

  const handleEditBatch = useCallback(
    (row: IssuanceBatchListItem) => {
      void runEditBatch(row)
    },
    [runEditBatch]
  )

  function handleEditDialogOpenChange(open: boolean) {
    setIsEditDialogOpen(open)
    if (!open) {
      setEditingBatchRow(null)
      setIsEditDetailLoading(false)
    }
  }

  function handleSaveEditedBatch() {
    if (!editingBatchRow) {
      toast.error('未选择要编辑的批次')
      return
    }

    const parsedQuantity = Number(editQuantity)
    const name = editBatchName.trim()

    if (!name || !Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      toast.error('请填写有效的批次名称和发行数量')
      return
    }

    if (parsedQuantity < editingBatchRow.generatedCount) {
      toast.error(
        `计划发行数量不能小于已生成的激活码数量（当前已生成 ${editingBatchRow.generatedCount} 个）`
      )
      return
    }

    updateIssuanceBatchMutation.mutate({
      batchId: editingBatchRow.id,
      payload: {
        name,
        quantity: parsedQuantity,
        activateValidFrom: new Date(editActivateValidFrom).toISOString(),
        activateValidTo: new Date(editActivateValidTo).toISOString(),
        remark: editRemark.trim(),
      },
    })
  }

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
              <BatchesTable
                data={data?.items ?? []}
                actionsDisabled={isBatchListMutating}
                onEditBatch={handleEditBatch}
                onSetBatchStatus={handleSetBatchStatus}
              />
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

      <EditBatchDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        isDetailLoading={isEditDetailLoading}
        batchNo={editingBatchRow?.batchNo ?? ''}
        seriesName={editingBatchRow?.seriesName ?? ''}
        batchName={editBatchName}
        onBatchNameChange={setEditBatchName}
        quantity={editQuantity}
        onQuantityChange={setEditQuantity}
        activateValidFrom={editActivateValidFrom}
        onActivateValidFromChange={setEditActivateValidFrom}
        activateValidTo={editActivateValidTo}
        onActivateValidToChange={setEditActivateValidTo}
        remark={editRemark}
        onRemarkChange={setEditRemark}
        minPlannedQuantity={editingBatchRow?.generatedCount}
        onSubmit={handleSaveEditedBatch}
        mutation={updateIssuanceBatchMutation}
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

/** 将毫秒时间戳格式化为 `<input type="datetime-local">` 所需的本地字符串。 */
function toDatetimeLocalInputValue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

function mapUpdateBatchErrorMessage(error: ApiError): string {
  if (error.code === 'ISSUANCE_BATCH_NOT_FOUND') {
    return '批次不存在，请刷新后重试'
  }

  if (error.code === 'ISSUANCE_BATCH_UPDATE_EMPTY_PAYLOAD') {
    return '请至少修改一项后再保存'
  }

  if (error.code === 'INVALID_ISSUANCE_BATCH_VALID_TIME_RANGE') {
    return '激活有效期不合法，请检查开始和结束时间'
  }

  if (error.code === 'ISSUANCE_BATCH_QUANTITY_BELOW_GENERATED') {
    return '计划发行数量不能小于已生成的激活码数量，请先处理多余码后再调低额度'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '批次信息校验失败，请检查输入内容'
  }

  return error.message || '批次更新失败，请稍后重试'
}

function mapUpdateBatchStatusErrorMessage(error: ApiError): string {
  if (error.code === 'ISSUANCE_BATCH_NOT_FOUND') {
    return '批次不存在，请刷新后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '状态参数不合法，请刷新后重试'
  }

  return error.message || '批次状态更新失败，请稍后重试'
}
