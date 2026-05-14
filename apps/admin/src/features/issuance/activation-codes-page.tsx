import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GenerateActivationCodesRequest } from '@contracts/admin/activation-codes'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  generateActivationCodes,
  listActivationCodes,
} from '@/apis/issuance/activation-codes'
import { listIssuanceBatches } from '@/apis/issuance/batches'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-error'
import { ActivationCodesTable } from './components/activation-codes-table'
import { GenerateActivationCodesDialog } from './components/generate-activation-codes-dialog'

export function ActivationCodesPage() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
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

  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>发行管理 / 激活码管理</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>激活码管理</h1>
            <p className='text-sm text-muted-foreground'>
              查看、导出、发放与作废激活码，并追踪对应藏品编号。
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline'>导出激活码</Button>
            <Button onClick={() => handleOpenGenerateDialog(true)}>批量生成</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>激活码列表</CardTitle>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个激活码。列表筛选、排序和字段显隐统一走
              data-table 组件。
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='py-8 text-center text-muted-foreground'>
                正在加载激活码数据...
              </div>
            ) : isError ? (
              <div className='py-8 text-center text-destructive'>
                激活码数据加载失败，请稍后重试。
              </div>
            ) : (
              <ActivationCodesTable data={data?.items ?? []} />
            )}
          </CardContent>
        </Card>
      </Main>

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
        onSubmit={handleGenerateActivationCodes}
        mutation={generateActivationCodesMutation}
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
