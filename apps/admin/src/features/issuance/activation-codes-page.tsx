import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ActivationCodeListItem,
  GenerateActivationCodesRequest,
} from '@contracts/admin/activation-codes'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageLayout } from '@/components/layout/page-layout'
import {
  generateActivationCodes,
  listActivationCodes,
  voidActivationCode,
} from '@/apis/issuance/activation-codes'
import { listIssuanceBatches } from '@/apis/issuance/batches'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { ActivationCodesTable } from './components/activation-codes-table'
import { GenerateActivationCodesDialog } from './components/generate-activation-codes-dialog'

export function ActivationCodesPage() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<ActivationCodeListItem | null>(null)
  const [batchId, setBatchId] = useState('')
  const [count, setCount] = useState('10')
  const [issuedChannel, setIssuedChannel] = useState('offline_event')
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'activation-codes'],
    queryFn: () =>
      listActivationCodes({
        page: 1,
        pageSize: 20,
      }),
  })
  const { data: batchesData } = useQuery({
    queryKey: ['admin', 'issuance-batches', 'enabled-options'],
    queryFn: () =>
      listIssuanceBatches({
        page: 1,
        pageSize: 100,
      }),
  })
  const batchOptions = useMemo(
    () =>
      (batchesData?.items ?? []).filter(
        (item) => item.status === 'ENABLED' && item.seriesStatus === 'ENABLED'
      ),
    [batchesData]
  )
  const generateActivationCodesMutation = useMutation({
    mutationFn: (payload: GenerateActivationCodesRequest) =>
      generateActivationCodes(payload),
    onSuccess: async (result) => {
      toast.success(`已生成 ${result.generatedCount} 个激活码`)
      setIsGenerateDialogOpen(false)
      setBatchId(batchOptions[0]?.id ?? '')
      setCount('10')
      setIssuedChannel('offline_event')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'activation-codes'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapGenerateActivationCodesErrorMessage(error))
        return
      }

      toast.error('激活码生成失败，请稍后重试')
    },
  })
  const voidActivationCodeMutation = useMutation({
    mutationFn: (activationCodeId: string) => voidActivationCode(activationCodeId),
    onSuccess: async () => {
      toast.success('激活码已作废')
      setVoidConfirmOpen(false)
      setVoidTarget(null)
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'activation-codes'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapVoidActivationCodeErrorMessage(error))
        return
      }

      toast.error('作废失败，请稍后重试')
    },
  })

  const isActivationCodesMutating = useMemo(
    () =>
      generateActivationCodesMutation.isPending ||
      voidActivationCodeMutation.isPending,
    [
      generateActivationCodesMutation.isPending,
      voidActivationCodeMutation.isPending,
    ]
  )

  const { mutate: mutateVoidActivationCode } = voidActivationCodeMutation

  const handleVoidRequest = useCallback((row: ActivationCodeListItem) => {
    setVoidTarget(row)
    setVoidConfirmOpen(true)
  }, [])

  const handleConfirmVoidActivationCode = useCallback(() => {
    if (!voidTarget) return
    mutateVoidActivationCode(voidTarget.id)
  }, [voidTarget, mutateVoidActivationCode])

  function handleVoidConfirmOpenChange(open: boolean) {
    setVoidConfirmOpen(open)
    if (!open) {
      setVoidTarget(null)
    }
  }

  function handleOpenGenerateDialog(open: boolean) {
    setIsGenerateDialogOpen(open)

    if (open) {
      const first = batchOptions[0]
      if (first && (!batchId || !batchOptions.some((b) => b.id === batchId))) {
        setBatchId(first.id)
      }
      if (!first) {
        setBatchId('')
      }
    }
  }

  function handleGenerateActivationCodes() {
    const parsedCount = Number(count)
    const payload = {
      batchId,
      count: parsedCount,
      issuedChannel: issuedChannel.trim(),
    } satisfies GenerateActivationCodesRequest

    if (!payload.batchId || !payload.issuedChannel || !Number.isFinite(parsedCount)) {
      toast.error('请完整填写批次、生成数量和发放渠道')
      return
    }

    generateActivationCodesMutation.mutate(payload)
  }

  function handleExportActivationCodes(
    items: ActivationCodeListItem[],
    total: number
  ) {
    if (items.length === 0) {
      toast.error('暂无数据可导出')
      return
    }

    const filename = `activation-codes-${formatExportFilenameDate(new Date())}.csv`
    downloadUtf8Csv(filename, buildActivationCodesCsv(items))

    if (total > items.length) {
      toast.success(`已导出 ${items.length} 条`, {
        description: `全量共 ${total} 条，当前为接口第 1 页数据；全量导出需后续专用接口。`,
      })
      return
    }

    toast.success(`已导出 ${items.length} 条`)
  }

  return (
    <>
      <PageLayout>
        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载激活码数据...
          </div>
        ) : isError ? (
          <div className='py-8 text-center text-destructive'>
            激活码数据加载失败，请稍后重试。
          </div>
        ) : (
          <ActivationCodesTable
            data={data?.items ?? []}
            actionsDisabled={isActivationCodesMutating}
            onVoidRequest={handleVoidRequest}
            totalCount={data?.total}
            listIntro={{
              title: '激活码列表',
              description: (
                <>
                  当前共 {data?.total ?? 0} 个激活码；「导出激活码」仅导出第 1 页已加载数据（每页
                  20 条）。列表筛选、排序和字段显隐统一走 data-table 组件。
                </>
              ),
            }}
            toolbarActions={
              <>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isActivationCodesMutating || isLoading || isError}
                  onClick={() =>
                    handleExportActivationCodes(data?.items ?? [], data?.total ?? 0)
                  }
                >
                  导出激活码
                </Button>
                <Button
                  size='sm'
                  onClick={() => handleOpenGenerateDialog(true)}
                  disabled={isActivationCodesMutating}
                >
                  批量生成
                </Button>
              </>
            }
          />
        )}
      </PageLayout>

      <GenerateActivationCodesDialog
        open={isGenerateDialogOpen}
        onOpenChange={handleOpenGenerateDialog}
        batchOptions={batchOptions}
        batchId={batchId}
        onBatchIdChange={setBatchId}
        count={count}
        onCountChange={setCount}
        issuedChannel={issuedChannel}
        onIssuedChannelChange={setIssuedChannel}
        disableActions={voidActivationCodeMutation.isPending}
        onSubmit={handleGenerateActivationCodes}
        mutation={generateActivationCodesMutation}
      />

      <ConfirmDialog
        open={voidConfirmOpen}
        onOpenChange={handleVoidConfirmOpenChange}
        title='作废激活码'
        desc={
          voidTarget
            ? `确定将激活码「${voidTarget.code}」作废吗？作废后无法恢复；对应藏品记录仍保留，但无法再凭此码激活。`
            : ''
        }
        cancelBtnText='取消'
        confirmText='确认作废'
        destructive
        isLoading={voidActivationCodeMutation.isPending}
        disabled={!voidTarget}
        handleConfirm={handleConfirmVoidActivationCode}
      />
    </>
  )
}

/**
 * 将激活码生成错误转换为更适合后台操作的提示。
 */
function mapGenerateActivationCodesErrorMessage(error: ApiError): string {
  if (error.code === 'ISSUANCE_BATCH_NOT_FOUND') {
    return '所选批次不存在，请刷新后重试'
  }

  if (error.code === 'ISSUANCE_BATCH_DISABLED') {
    return '所选批次已停用，请更换启用中的批次'
  }

  if (error.code === 'SERIES_DISABLED') {
    return '该批次所属系列已停用，无法继续生成激活码，请先启用系列或更换批次'
  }

  if (error.code === 'ISSUANCE_BATCH_ID_REQUIRED') {
    return '请选择要生成激活码的批次'
  }

  if (error.code === 'ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY') {
    return '生成数量超过批次可用额度，请调整后重试'
  }

  if (error.code === 'COLLECTION_NO_GENERATION_FAILED') {
    return '藏品编号生成失败，请稍后重试'
  }

  if (error.code === 'ACTIVATION_CODE_GENERATION_FAILED') {
    return '激活码生成失败（唯一性冲突），请稍后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '激活码生成参数校验失败，请检查输入内容'
  }

  return error.message || '激活码生成失败，请稍后重试'
}

function mapVoidActivationCodeErrorMessage(error: ApiError): string {
  if (error.code === 'ACTIVATION_CODE_NOT_FOUND') {
    return '激活码不存在，请刷新后重试'
  }

  if (error.code === 'ACTIVATION_CODE_CANNOT_VOID_USED') {
    return '该激活码已使用，不能作废'
  }

  if (error.code === 'ACTIVATION_CODE_ALREADY_VOIDED') {
    return '该激活码已作废'
  }

  if (error.code === 'ACTIVATION_CODE_CANNOT_VOID_EXPIRED') {
    return '该激活码已过期，无需作废'
  }

  if (error.code === 'ACTIVATION_CODE_CANNOT_VOID') {
    return '当前状态下不允许作废该激活码'
  }

  if (error.code === 'ACTIVATION_CODE_ID_REQUIRED') {
    return '缺少激活码标识，请刷新后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '请求参数校验失败，请刷新后重试'
  }

  return error.message || '作废失败，请稍后重试'
}

function formatExportFilenameDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

function activationCodeStatusLabelForExport(status: string): string {
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

function formatExportTimestamp(ms: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(ms)
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildActivationCodesCsv(items: ActivationCodeListItem[]): string {
  const header = [
    '激活码',
    '所属批次',
    '对应藏品编号',
    '状态',
    '失效时间',
  ].join(',')
  const lines = items.map((item) =>
    [
      escapeCsvField(item.code),
      escapeCsvField(item.batchName),
      escapeCsvField(item.collectionNo),
      escapeCsvField(activationCodeStatusLabelForExport(item.status)),
      escapeCsvField(
        item.expiredAt === null ? '' : formatExportTimestamp(item.expiredAt)
      ),
    ].join(',')
  )
  return [header, ...lines].join('\r\n')
}

function downloadUtf8Csv(filename: string, csvBody: string) {
  const blob = new Blob([`\uFEFF${csvBody}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
}
