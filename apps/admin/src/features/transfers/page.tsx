import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListTransferOrdersResponseData } from '@contracts/admin/transfers'
import {
  completeTransferOrder,
  expireTransferOrder,
  getTransferOperationsOverview,
  getTransferOrderHistory,
  listTransferOperationRecords,
  listTransferOrders,
  rollbackTransferOrder,
  syncTransferOrderOwner,
} from '@/apis/transfers/transfers'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataListIntro } from '@/components/data-table'
import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  formatTransferAnomaly,
  formatTransferOperationAction,
  buildTransferOperationRecordsQueryParams,
  buildTransferOrdersQueryParams,
  formatTransferMode,
  formatTransferReceiver,
  formatTransferStatus,
  formatTransferTimestamp,
  mapListTransferOrdersErrorMessage,
  mapTransferOperationRecordsErrorMessage,
  mapTransferOrderHistoryErrorMessage,
  TRANSFER_ANOMALY_FILTER_ALL,
  TRANSFER_ANOMALY_OPTIONS,
  TRANSFER_MODE_FILTER_ALL,
  TRANSFER_MODE_OPTIONS,
  TRANSFER_OPERATION_TYPE_FILTER_ALL,
  TRANSFER_OPERATION_TYPE_OPTIONS,
  TRANSFER_STATUS_FILTER_ALL,
  TRANSFER_STATUS_OPTIONS,
} from '@/lib/transfers-display'
import {
  buildTransferOperationRecordsCsv,
  downloadUtf8Csv,
} from '@/lib/transfers-csv'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function formatExportFilenameDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

export function TransfersPage() {
  const queryClient = useQueryClient()
  const transferFiltersRef = useRef<HTMLDivElement | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [status, setStatus] = useState(TRANSFER_STATUS_FILTER_ALL)
  const [transferMode, setTransferMode] = useState(TRANSFER_MODE_FILTER_ALL)
  const [anomalyCode, setAnomalyCode] = useState(TRANSFER_ANOMALY_FILTER_ALL)
  const [operationPage, setOperationPage] = useState(1)
  const operationPageSize = 10
  const [operationActionType, setOperationActionType] = useState(
    TRANSFER_OPERATION_TYPE_FILTER_ALL
  )
  const [operationTransferNoDraft, setOperationTransferNoDraft] = useState('')
  const [operationTransferNoFilter, setOperationTransferNoFilter] = useState('')
  const [operationOperatorAccountDraft, setOperationOperatorAccountDraft] = useState('')
  const [operationOperatorAccountFilter, setOperationOperatorAccountFilter] = useState('')
  const [collectionNoDraft, setCollectionNoDraft] = useState('')
  const [collectionNoFilter, setCollectionNoFilter] = useState('')
  const [expireTarget, setExpireTarget] = useState<
    ListTransferOrdersResponseData['items'][number] | null
  >(null)
  const [expireReason, setExpireReason] = useState('')
  const [completeTarget, setCompleteTarget] = useState<
    ListTransferOrdersResponseData['items'][number] | null
  >(null)
  const [completeReason, setCompleteReason] = useState('')
  const [rollbackTarget, setRollbackTarget] = useState<
    ListTransferOrdersResponseData['items'][number] | null
  >(null)
  const [rollbackReason, setRollbackReason] = useState('')
  const [syncOwnerTarget, setSyncOwnerTarget] = useState<
    ListTransferOrdersResponseData['items'][number] | null
  >(null)
  const [syncOwnerReason, setSyncOwnerReason] = useState('')
  const [historyContext, setHistoryContext] = useState<
    ListTransferOrdersResponseData['items'][number] | null
  >(null)

  const queryParams = useMemo(
    () =>
      buildTransferOrdersQueryParams({
        page,
        pageSize,
        collectionNoFilter,
        status,
        transferMode,
        anomalyCode,
      }),
    [anomalyCode, collectionNoFilter, page, pageSize, status, transferMode]
  )
  const operationQueryParams = useMemo(
    () =>
      buildTransferOperationRecordsQueryParams({
        page: operationPage,
        pageSize: operationPageSize,
        collectionNoFilter,
        transferNoFilter: operationTransferNoFilter,
        operatorAdminAccountNoFilter: operationOperatorAccountFilter,
        actionType: operationActionType,
      }),
    [
      collectionNoFilter,
      operationActionType,
      operationOperatorAccountFilter,
      operationPage,
      operationPageSize,
      operationTransferNoFilter,
    ]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'transfers', queryParams],
    queryFn: () => listTransferOrders(queryParams),
  })
  const operationsOverviewQuery = useQuery({
    queryKey: ['admin', 'transfers', 'operations', 'overview'],
    queryFn: getTransferOperationsOverview,
  })
  const historyQuery = useQuery({
    queryKey: ['admin', 'transfers', 'history', historyContext?.transferId],
    queryFn: () => getTransferOrderHistory(historyContext!.transferId),
    enabled: !!historyContext,
  })
  const operationRecordsQuery = useQuery({
    queryKey: ['admin', 'transfers', 'operations', operationQueryParams],
    queryFn: () => listTransferOperationRecords(operationQueryParams),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const operationsOverview = operationsOverviewQuery.data
  const operationItems = operationRecordsQuery.data?.items ?? []
  const operationTotal = operationRecordsQuery.data?.total ?? 0
  const operationTotalPages = Math.max(1, Math.ceil(operationTotal / operationPageSize))
  const operationsOverviewCards = [
    {
      title: '累计处置',
      value: operationsOverview?.totalOperationRecords ?? 0,
      hint: `最近处置 ${formatTransferTimestamp(operationsOverview?.latestOperationAt ?? null)}`,
    },
    {
      title: '释放超时单',
      value: operationsOverview?.expiredOperations ?? 0,
      hint: '人工释放超时未接收转让',
    },
    {
      title: '强制完成',
      value: operationsOverview?.forceCompletedOperations ?? 0,
      hint: '到账后补记完成',
    },
    {
      title: '强制回滚',
      value: operationsOverview?.forceRolledBackOperations ?? 0,
      hint: '客诉或事故撤销转让',
    },
    {
      title: '修复归属',
      value: operationsOverview?.syncedOwnerOperations ?? 0,
      hint: '按完成结果回填 owner',
    },
  ]
  const anomalyOverviewCards = [
    {
      title: '超时未释放',
      code: 'EXPIRED_PENDING_RELEASE',
      value: operationsOverview?.expiredPendingReleaseAnomalies ?? 0,
      hint: '待运营释放的过期待接收单',
    },
    {
      title: '待接收已到账',
      code: 'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED',
      value: operationsOverview?.pendingAcceptOwnerAlreadyTransferredAnomalies ?? 0,
      hint: '待补记完成的异常到账单',
    },
    {
      title: '已完成未对齐',
      code: 'COMPLETED_OWNER_MISMATCH',
      value: operationsOverview?.completedOwnerMismatchAnomalies ?? 0,
      hint: '待修复归属的已完成转让',
    },
  ]

  const expireTransferMutation = useMutation({
    mutationFn: (variables: { transferId: string; reason: string }) =>
      expireTransferOrder(variables.transferId, { reason: variables.reason }),
    onSuccess: async () => {
      toast.success('超时转让已释放为已失效')
      setExpireTarget(null)
      setExpireReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'transfers'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'transfers', 'operations', 'overview'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapListTransferOrdersErrorMessage(error))
    },
  })
  const completeTransferMutation = useMutation({
    mutationFn: (variables: { transferId: string; reason: string }) =>
      completeTransferOrder(variables.transferId, { reason: variables.reason }),
    onSuccess: async () => {
      toast.success('转让已补记为已完成')
      setCompleteTarget(null)
      setCompleteReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'transfers'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'transfers', 'operations', 'overview'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapListTransferOrdersErrorMessage(error))
    },
  })
  const rollbackTransferMutation = useMutation({
    mutationFn: (variables: { transferId: string; reason: string }) =>
      rollbackTransferOrder(variables.transferId, { reason: variables.reason }),
    onSuccess: async () => {
      toast.success('转让已强制回滚为发起方持有')
      setRollbackTarget(null)
      setRollbackReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'transfers'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'transfers', 'operations', 'overview'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapListTransferOrdersErrorMessage(error))
    },
  })
  const syncOwnerMutation = useMutation({
    mutationFn: (variables: { transferId: string; reason: string }) =>
      syncTransferOrderOwner(variables.transferId, { reason: variables.reason }),
    onSuccess: async () => {
      toast.success('藏品归属已按完成转让结果修复')
      setSyncOwnerTarget(null)
      setSyncOwnerReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'transfers'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'transfers', 'operations', 'overview'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapListTransferOrdersErrorMessage(error))
    },
  })

  const applyCollectionNoFilter = () => {
    setCollectionNoFilter(collectionNoDraft.trim())
    setPage(1)
    setOperationPage(1)
  }

  const clearCollectionNoFilter = () => {
    setCollectionNoDraft('')
    setCollectionNoFilter('')
    setPage(1)
    setOperationPage(1)
  }

  const applyOperationFilters = () => {
    setOperationTransferNoFilter(operationTransferNoDraft.trim())
    setOperationOperatorAccountFilter(operationOperatorAccountDraft.trim())
    setOperationPage(1)
  }

  const clearOperationFilters = () => {
    setOperationTransferNoDraft('')
    setOperationTransferNoFilter('')
    setOperationOperatorAccountDraft('')
    setOperationOperatorAccountFilter('')
    setOperationPage(1)
  }

  const handleConfirmExpireTransfer = () => {
    if (!expireTarget) {
      return
    }
    if (!expireReason.trim()) {
      toast.error('请填写本次释放原因，便于后续追溯。')
      return
    }

    expireTransferMutation.mutate({
      transferId: expireTarget.transferId,
      reason: expireReason.trim(),
    })
  }

  const handleConfirmCompleteTransfer = () => {
    if (!completeTarget) {
      return
    }
    if (!completeReason.trim()) {
      toast.error('请填写本次补记完成原因，便于后续追溯。')
      return
    }

    completeTransferMutation.mutate({
      transferId: completeTarget.transferId,
      reason: completeReason.trim(),
    })
  }

  const handleConfirmRollbackTransfer = () => {
    if (!rollbackTarget) {
      return
    }
    if (!rollbackReason.trim()) {
      toast.error('请填写本次回滚原因，便于后续追溯。')
      return
    }

    rollbackTransferMutation.mutate({
      transferId: rollbackTarget.transferId,
      reason: rollbackReason.trim(),
    })
  }

  const handleConfirmSyncOwner = () => {
    if (!syncOwnerTarget) {
      return
    }
    if (!syncOwnerReason.trim()) {
      toast.error('请填写本次修复原因，便于后续追溯。')
      return
    }

    syncOwnerMutation.mutate({
      transferId: syncOwnerTarget.transferId,
      reason: syncOwnerReason.trim(),
    })
  }

  const handleExportOperationRecordsCsv = () => {
    if (operationRecordsQuery.isLoading) {
      toast.error('请等待运营处置记录加载完成后再导出')
      return
    }
    if (operationRecordsQuery.isError) {
      toast.error('运营处置记录加载失败，请先重试后再导出')
      return
    }
    if (operationItems.length === 0) {
      toast.error('当前页没有可导出的运营处置记录')
      return
    }

    const filename = `transfer-operation-records-${formatExportFilenameDate(new Date())}.csv`
    downloadUtf8Csv(filename, buildTransferOperationRecordsCsv(operationItems))

    if (operationTotal > operationItems.length) {
      toast.success(`已导出当前页 ${operationItems.length} 条运营处置记录`, {
        description: `当前筛选下共 ${operationTotal} 条，现阶段仅导出已加载数据。`,
      })
      return
    }

    toast.success(`已导出 ${operationItems.length} 条运营处置记录`)
  }

  const handleSelectAnomalyOverviewCard = (nextAnomalyCode: string) => {
    const resolvedAnomalyCode =
      anomalyCode === nextAnomalyCode ? TRANSFER_ANOMALY_FILTER_ALL : nextAnomalyCode

    setAnomalyCode(resolvedAnomalyCode)
    setPage(1)

    requestAnimationFrame(() => {
      transferFiltersRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      document.getElementById('transfer-anomaly-filter')?.focus()
    })
  }

  return (
    <>
      <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>转让记录</h1>
          <p className='text-sm text-muted-foreground'>
            查看真实转让单、异常态和流转去向，并处理超时释放与归属修复场景。
          </p>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>正在加载转让记录…</div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapListTransferOrdersErrorMessage(error)}
            </p>
            <Button type='button' variant='outline' size='sm' onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
              {operationsOverviewCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{card.value}</div>
                    <p className='text-xs text-muted-foreground'>{card.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              {anomalyOverviewCards.map((card) => (
                <button
                  key={card.title}
                  type='button'
                  className='text-left'
                  aria-pressed={anomalyCode === card.code}
                  onClick={() => handleSelectAnomalyOverviewCard(card.code)}
                >
                  <Card
                    className={cn(
                      'transition hover:bg-muted/40',
                      anomalyCode === card.code
                        ? 'bg-muted/60 ring-2 ring-primary/40'
                        : 'ring-1 ring-foreground/10'
                    )}
                  >
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='text-2xl font-bold'>{card.value}</div>
                      <p className='text-xs text-muted-foreground'>{card.hint}</p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>

            <DataListIntro
              blocks={[
                {
                  title: '转让单列表',
                  description:
                    '列表已对接真实转让单数据，可按藏品编号、转让方式、状态与异常态筛选；点击页头异常卡可直接切到对应异常明细，再点一次可取消锁定。',
                },
              ]}
            />

            <div
              ref={transferFiltersRef}
              role='toolbar'
              className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
            >
              <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3'>
                <div className='space-y-1.5'>
                  <Label
                    htmlFor='transfer-status-filter'
                    className='text-xs text-muted-foreground'
                  >
                    转让状态
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger id='transfer-status-filter' className='h-8 w-[180px]'>
                      <SelectValue placeholder='筛选转让状态' />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='transfer-mode-filter' className='text-xs text-muted-foreground'>
                    转让方式
                  </Label>
                  <Select
                    value={transferMode}
                    onValueChange={(value) => {
                      setTransferMode(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger id='transfer-mode-filter' className='h-8 w-[180px]'>
                      <SelectValue placeholder='筛选转让方式' />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label
                    htmlFor='transfer-anomaly-filter'
                    className='text-xs text-muted-foreground'
                  >
                    异常态
                  </Label>
                  <Select
                    value={anomalyCode}
                    onValueChange={(value) => {
                      setAnomalyCode(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger
                      id='transfer-anomaly-filter'
                      className={cn(
                        'h-8 w-[220px]',
                        anomalyCode !== TRANSFER_ANOMALY_FILTER_ALL &&
                          'ring-2 ring-primary/30'
                      )}
                    >
                      <SelectValue placeholder='筛选异常态' />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_ANOMALY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex min-w-0 flex-col gap-1.5'>
                  <Label
                    htmlFor='transfer-collection-no-filter'
                    className='text-xs text-muted-foreground'
                  >
                    按藏品编号（精确）
                  </Label>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      id='transfer-collection-no-filter'
                      className='h-8 w-[min(100%,220px)]'
                      placeholder='如 COL-SEED-TRANSFER-001'
                      value={collectionNoDraft}
                      onChange={(event) => setCollectionNoDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          applyCollectionNoFilter()
                        }
                      }}
                    />
                    <Button
                      type='button'
                      variant='secondary'
                      size='sm'
                      className='h-8'
                      onClick={applyCollectionNoFilter}
                    >
                      应用
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8'
                      onClick={clearCollectionNoFilter}
                      disabled={!collectionNoDraft.trim() && !collectionNoFilter.trim()}
                    >
                      清空
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>转让单列表</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className='py-8 text-center text-muted-foreground'>
                    当前筛选条件下暂无转让记录。
                  </div>
                ) : (
                  <>
                    <div className='overflow-hidden rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>转让单号</TableHead>
                            <TableHead>藏品编号</TableHead>
                            <TableHead>转让方式</TableHead>
                            <TableHead>转出会员</TableHead>
                            <TableHead>转入会员</TableHead>
                            <TableHead>转让码</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>异常态</TableHead>
                            <TableHead>发起时间</TableHead>
                            <TableHead>有效期</TableHead>
                            <TableHead>完成时间</TableHead>
                            <TableHead className='text-right'>操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((row) => (
                            <TableRow key={row.transferId}>
                              <TableCell className='font-medium'>{row.transferNo}</TableCell>
                              <TableCell>{row.collectionNo}</TableCell>
                              <TableCell>{formatTransferMode(row.transferMode)}</TableCell>
                              <TableCell>
                                <div className='flex flex-col'>
                                  <span>{row.fromMemberNickname}</span>
                                  <span className='text-xs text-muted-foreground'>
                                    {row.fromMemberNo}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className='max-w-[220px]'>
                                <span
                                  className='block truncate text-sm'
                                  title={formatTransferReceiver({
                                    toMemberNo: row.toMemberNo,
                                    toMemberNickname: row.toMemberNickname,
                                    transferMode: row.transferMode,
                                  })}
                                >
                                  {formatTransferReceiver({
                                    toMemberNo: row.toMemberNo,
                                    toMemberNickname: row.toMemberNickname,
                                    transferMode: row.transferMode,
                                  })}
                                </span>
                              </TableCell>
                              <TableCell className='font-mono text-xs text-muted-foreground'>
                                {row.transferCode ?? '—'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    row.status === 'PENDING_ACCEPT'
                                      ? 'secondary'
                                      : row.status === 'COMPLETED'
                                        ? 'outline'
                                        : row.status === 'ROLLED_BACK'
                                          ? 'secondary'
                                        : 'destructive'
                                  }
                                >
                                  {formatTransferStatus(row.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {row.anomalyCode ? (
                                  <Badge variant='destructive'>
                                    {formatTransferAnomaly(row.anomalyCode)}
                                  </Badge>
                                ) : (
                                  <span className='text-muted-foreground'>—</span>
                                )}
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                {formatTransferTimestamp(row.createdAt)}
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                {formatTransferTimestamp(row.expiredAt)}
                              </TableCell>
                              <TableCell className='text-muted-foreground'>
                                {formatTransferTimestamp(row.completedAt)}
                              </TableCell>
                              <TableCell className='text-right'>
                                <div className='flex justify-end gap-2'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => setHistoryContext(row)}
                                  >
                                    查看留痕
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                      row.status !== 'COMPLETED' ||
                                      rollbackTransferMutation.isPending
                                    }
                                    onClick={() => {
                                      setRollbackTarget(row)
                                      setRollbackReason('')
                                    }}
                                  >
                                    强制回滚
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                      row.anomalyCode !==
                                        'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED' ||
                                      completeTransferMutation.isPending
                                    }
                                    onClick={() => {
                                      setCompleteTarget(row)
                                      setCompleteReason('')
                                    }}
                                  >
                                    强制完成
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                      row.anomalyCode !== 'EXPIRED_PENDING_RELEASE' ||
                                      expireTransferMutation.isPending
                                    }
                                    onClick={() => {
                                      setExpireTarget(row)
                                      setExpireReason('')
                                    }}
                                  >
                                    释放超时单
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                      row.anomalyCode !== 'COMPLETED_OWNER_MISMATCH' ||
                                      syncOwnerMutation.isPending
                                    }
                                    onClick={() => {
                                      setSyncOwnerTarget(row)
                                      setSyncOwnerReason('')
                                    }}
                                  >
                                    修复归属
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
                      <p className='text-sm text-muted-foreground tabular-nums'>
                        共 {total} 条 · 每页 {pageSize} 条 · 第 {page} / {totalPages} 页
                      </p>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                          上一页
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={page >= totalPages}
                          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle>运营处置记录</CardTitle>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      汇总所有人工释放、强制完成、强制回滚与归属修复动作，支持按当前页导出补偿台账。
                    </p>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={operationRecordsQuery.isLoading || operationRecordsQuery.isError}
                    onClick={handleExportOperationRecordsCsv}
                  >
                    导出当前页 CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                  <div className='flex flex-wrap items-end gap-3'>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='transfer-operation-action-filter'
                        className='text-xs text-muted-foreground'
                      >
                        处置动作
                      </Label>
                      <Select
                        value={operationActionType}
                        onValueChange={(value) => {
                          setOperationActionType(value)
                          setOperationPage(1)
                        }}
                      >
                        <SelectTrigger
                          id='transfer-operation-action-filter'
                          className='h-8 w-[180px]'
                        >
                          <SelectValue placeholder='筛选处置动作' />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFER_OPERATION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='transfer-operation-transfer-no-filter'
                        className='text-xs text-muted-foreground'
                      >
                        转让单号（精确）
                      </Label>
                      <Input
                        id='transfer-operation-transfer-no-filter'
                        className='h-8 w-[180px]'
                        placeholder='如 TR-0003'
                        value={operationTransferNoDraft}
                        onChange={(event) => setOperationTransferNoDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            applyOperationFilters()
                          }
                        }}
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label
                        htmlFor='transfer-operation-operator-filter'
                        className='text-xs text-muted-foreground'
                      >
                        操作人账号（精确）
                      </Label>
                      <Input
                        id='transfer-operation-operator-filter'
                        className='h-8 w-[180px]'
                        placeholder='如 ADM000001'
                        value={operationOperatorAccountDraft}
                        onChange={(event) => setOperationOperatorAccountDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            applyOperationFilters()
                          }
                        }}
                      />
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='secondary'
                        size='sm'
                        className='h-8'
                        onClick={applyOperationFilters}
                      >
                        应用
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-8'
                        onClick={clearOperationFilters}
                        disabled={
                          !operationTransferNoDraft.trim() &&
                          !operationTransferNoFilter.trim() &&
                          !operationOperatorAccountDraft.trim() &&
                          !operationOperatorAccountFilter.trim()
                        }
                      >
                        清空
                      </Button>
                    </div>
                  </div>
                </div>

                {operationRecordsQuery.isLoading ? (
                  <div className='py-8 text-center text-muted-foreground'>
                    正在加载运营处置记录…
                  </div>
                ) : operationRecordsQuery.isError ? (
                  <div className='flex flex-col items-center gap-3 py-8'>
                    <p className='max-w-md text-center text-destructive'>
                      {mapTransferOperationRecordsErrorMessage(operationRecordsQuery.error)}
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => void operationRecordsQuery.refetch()}
                    >
                      重试
                    </Button>
                  </div>
                ) : operationItems.length === 0 ? (
                  <div className='py-8 text-center text-muted-foreground'>
                    当前筛选条件下暂无运营处置记录。
                  </div>
                ) : (
                  <>
                    <div className='overflow-hidden rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>动作</TableHead>
                            <TableHead>转让单号</TableHead>
                            <TableHead>藏品编号</TableHead>
                            <TableHead>状态变化</TableHead>
                            <TableHead>操作人</TableHead>
                            <TableHead>原因</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operationItems.map((item) => (
                            <TableRow key={item.operationRecordId}>
                              <TableCell className='text-sm text-muted-foreground'>
                                {formatTransferTimestamp(item.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant='secondary'>
                                  {formatTransferOperationAction(item.actionType)}
                                </Badge>
                              </TableCell>
                              <TableCell className='font-medium'>{item.transferNo}</TableCell>
                              <TableCell>{item.collectionNo}</TableCell>
                              <TableCell className='text-sm text-muted-foreground'>
                                {formatTransferStatus(item.beforeStatus ?? '—')}
                                {' -> '}
                                {formatTransferStatus(item.afterStatus ?? '—')}
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-col'>
                                  <span>{item.operatorAdminDisplayName ?? '系统/未知'}</span>
                                  <span className='text-xs text-muted-foreground'>
                                    {item.operatorAdminAccountNo ?? '—'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className='max-w-[360px] whitespace-pre-wrap break-words text-sm'>
                                {item.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
                      <p className='text-sm text-muted-foreground tabular-nums'>
                        共 {operationTotal} 条 · 每页 {operationPageSize} 条 · 第 {operationPage} /{' '}
                        {operationTotalPages} 页
                      </p>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={operationPage <= 1}
                          onClick={() =>
                            setOperationPage((current) => Math.max(1, current - 1))
                          }
                        >
                          上一页
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={operationPage >= operationTotalPages}
                          onClick={() =>
                            setOperationPage((current) =>
                              Math.min(operationTotalPages, current + 1)
                            )
                          }
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageLayout>

      <ConfirmDialog
        open={expireTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setExpireTarget(null)
            setExpireReason('')
          }
        }}
        title='确认释放超时转让'
        desc={
          expireTarget ? (
            <>
              将把转让单「{expireTarget.transferNo}」直接释放为已失效，并向转出会员发送过期通知。
            </>
          ) : (
            ''
          )
        }
        confirmText='确认释放'
        cancelBtnText='取消'
        destructive
        isLoading={expireTransferMutation.isPending}
        handleConfirm={handleConfirmExpireTransfer}
      >
        <div className='space-y-2'>
          <Label htmlFor='transfer-expire-reason'>处置原因</Label>
          <Textarea
            id='transfer-expire-reason'
            placeholder='例如：会员长期未接收，客服人工释放超时单'
            value={expireReason}
            onChange={(event) => setExpireReason(event.target.value)}
            rows={4}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={completeTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null)
            setCompleteReason('')
          }
        }}
        title='确认强制完成转让'
        desc={
          completeTarget ? (
            <>
              将把转让单「{completeTarget.transferNo}」直接补记为已完成，并向转出会员发送完成通知。
            </>
          ) : (
            ''
          )
        }
        confirmText='确认完成'
        cancelBtnText='取消'
        destructive
        isLoading={completeTransferMutation.isPending}
        handleConfirm={handleConfirmCompleteTransfer}
      >
        <div className='space-y-2'>
          <Label htmlFor='transfer-complete-reason'>处置原因</Label>
          <Textarea
            id='transfer-complete-reason'
            placeholder='例如：链路补偿已到账但状态未完成，后台补记完成'
            value={completeReason}
            onChange={(event) => setCompleteReason(event.target.value)}
            rows={4}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={rollbackTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setRollbackTarget(null)
            setRollbackReason('')
          }
        }}
        title='确认强制回滚转让'
        desc={
          rollbackTarget ? (
            <>
              将把转让单「{rollbackTarget.transferNo}」回滚为发起方持有，并通知相关会员以当前持有结果为准。
            </>
          ) : (
            ''
          )
        }
        confirmText='确认回滚'
        cancelBtnText='取消'
        destructive
        isLoading={rollbackTransferMutation.isPending}
        handleConfirm={handleConfirmRollbackTransfer}
      >
        <div className='space-y-2'>
          <Label htmlFor='transfer-rollback-reason'>回滚原因</Label>
          <Textarea
            id='transfer-rollback-reason'
            placeholder='例如：客诉判定需撤销已完成转让，藏品归还发起方'
            value={rollbackReason}
            onChange={(event) => setRollbackReason(event.target.value)}
            rows={4}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={syncOwnerTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setSyncOwnerTarget(null)
            setSyncOwnerReason('')
          }
        }}
        title='确认修复藏品归属'
        desc={
          syncOwnerTarget ? (
            <>
              将把转让单「{syncOwnerTarget.transferNo}」对应藏品的当前持有人修复为该转让单的接收方。
            </>
          ) : (
            ''
          )
        }
        confirmText='确认修复'
        cancelBtnText='取消'
        destructive
        isLoading={syncOwnerMutation.isPending}
        handleConfirm={handleConfirmSyncOwner}
      >
        <div className='space-y-2'>
          <Label htmlFor='transfer-sync-owner-reason'>修复原因</Label>
          <Textarea
            id='transfer-sync-owner-reason'
            placeholder='例如：历史补偿漏写 owner，按已完成转让结果回填'
            value={syncOwnerReason}
            onChange={(event) => setSyncOwnerReason(event.target.value)}
            rows={4}
          />
        </div>
      </ConfirmDialog>

      <Dialog
        open={historyContext != null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryContext(null)
          }
        }}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              转让运营留痕
              {historyContext ? ` · ${historyContext.transferNo}` : ''}
            </DialogTitle>
            <DialogDescription>
              展示后台对当前转让单执行过的人工处置记录，按留痕写入时间倒序排列。
            </DialogDescription>
          </DialogHeader>

          {historyQuery.isLoading ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              正在加载运营留痕…
            </div>
          ) : historyQuery.isError ? (
            <div className='py-8 text-center text-sm text-destructive'>
              {mapTransferOrderHistoryErrorMessage(historyQuery.error)}
            </div>
          ) : (historyQuery.data?.items ?? []).length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              当前转让单暂无人工处置留痕。
            </div>
          ) : (
            <div className='max-h-[60vh] overflow-y-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>动作</TableHead>
                    <TableHead>状态变化</TableHead>
                    <TableHead>归属变化</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyQuery.data?.items ?? []).map((item) => (
                    <TableRow key={item.operationRecordId}>
                      <TableCell>
                        <Badge variant='secondary'>
                          {formatTransferOperationAction(item.actionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {formatTransferStatus(item.beforeStatus ?? '—')}
                        {' -> '}
                        {formatTransferStatus(item.afterStatus ?? '—')}
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {(item.beforeCurrentOwnerMemberId ?? '—') +
                          ' -> ' +
                          (item.afterCurrentOwnerMemberId ?? '—')}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>{item.operatorAdminDisplayName ?? '系统/未知'}</span>
                          <span className='text-xs text-muted-foreground'>
                            {item.operatorAdminAccountNo ?? '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='max-w-[320px] whitespace-pre-wrap break-words text-sm'>
                        {item.reason}
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {formatTransferTimestamp(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
