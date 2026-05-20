import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionReviewListItem } from '@contracts/admin/collection-reviews'
import { toast } from 'sonner'
import {
  approveCollectionReview,
  listCollectionReviewHistory,
  listCollectionReviews,
  rejectCollectionReview,
  takedownPublishedContentVersion,
} from '@/apis/collections/collection-reviews'
import { AdminReadOnlyNotice } from '@/components/admin/admin-readonly-notice'
import { PageLayout } from '@/components/layout/page-layout'
import { DataListIntro } from '@/components/data-table'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ApiError } from '@/lib/api-error'
import {
  ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN,
} from '@/lib/admin-route-access'
import {
  buildCollectionReviewsQueryParams,
  formatReviewSource,
  formatReviewStage,
  formatReviewStatus,
  formatSubmittedAt,
  mapApproveReviewErrorMessage,
  mapCollectionReviewHistoryErrorMessage,
  mapListCollectionReviewsErrorMessage,
  mapRejectReviewErrorMessage,
  mapTakedownPublishErrorMessage,
  REVIEW_STATUS_OPTIONS,
  rowMayTakedownPublish,
} from '@/lib/collection-reviews-display'
import { buildCollectionReviewsCsv, downloadUtf8Csv } from '@/lib/collection-reviews-csv'

export function CollectionReviewsPage() {
  const queryClient = useQueryClient()
  const { hasAnyPermissions } = useAdminPermission()
  const canApproveReviews = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE])
  const canRejectReviews = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT])
  const canTakedownReviews = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN])
  const canOperateReviews =
    canApproveReviews || canRejectReviews || canTakedownReviews
  /** 默认展示待人工队列，与运营主路径一致；可切换为「全部状态」等。 */
  const [reviewStatus, setReviewStatus] = useState('PENDING_MANUAL')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [collectionNoDraft, setCollectionNoDraft] = useState('')
  const [collectionNoFilter, setCollectionNoFilter] = useState('')

  const [approveTarget, setApproveTarget] =
    useState<CollectionReviewListItem | null>(null)
  const [approveComment, setApproveComment] = useState('')

  const [rejectTarget, setRejectTarget] =
    useState<CollectionReviewListItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  /** 审核历史弹窗上下文：取当前行的藏品编号与内容版本以拉取时间线。 */
  const [historyContext, setHistoryContext] = useState<CollectionReviewListItem | null>(
    null,
  )

  const [takedownTarget, setTakedownTarget] = useState<CollectionReviewListItem | null>(
    null,
  )
  const [takedownReason, setTakedownReason] = useState('')

  const queryParams = useMemo(
    () =>
      buildCollectionReviewsQueryParams({
        page,
        pageSize,
        reviewStatus,
        collectionNoFilter,
      }),
    [page, pageSize, reviewStatus, collectionNoFilter]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'collection-reviews', queryParams],
    queryFn: () => listCollectionReviews(queryParams),
  })

  const historyQuery = useQuery({
    queryKey: [
      'admin',
      'collection-reviews',
      'history',
      historyContext?.collectionNo,
      historyContext?.contentVersionId,
    ],
    queryFn: () =>
      listCollectionReviewHistory({
        collectionNo: historyContext!.collectionNo,
        contentVersionId: historyContext!.contentVersionId,
      }),
    enabled: !!historyContext,
  })

  const approveMutation = useMutation({
    mutationFn: (variables: { reviewId: string; comment?: string }) =>
      approveCollectionReview(variables.reviewId, {
        comment: variables.comment?.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('已通过人工复核')
      setApproveTarget(null)
      setApproveComment('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-reviews'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapApproveReviewErrorMessage(error))
        return
      }
      toast.error('人工通过失败，请稍后重试')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (variables: { reviewId: string; reason: string }) =>
      rejectCollectionReview(variables.reviewId, {
        reason: variables.reason.trim(),
      }),
    onSuccess: async () => {
      toast.success('已驳回该人工复核')
      setRejectTarget(null)
      setRejectReason('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-reviews'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapRejectReviewErrorMessage(error))
        return
      }
      toast.error('人工驳回失败，请稍后重试')
    },
  })

  const takedownMutation = useMutation({
    mutationFn: (variables: { contentVersionId: string; reason?: string }) =>
      takedownPublishedContentVersion(variables.contentVersionId, {
        reason: variables.reason?.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('已下架该版本的公开展示')
      setTakedownTarget(null)
      setTakedownReason('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-reviews'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapTakedownPublishErrorMessage(error))
        return
      }
      toast.error('下架失败，请稍后重试')
    },
  })

  const items: CollectionReviewListItem[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleReviewStatusChange = (value: string) => {
    setReviewStatus(value)
    setPage(1)
  }

  const applyCollectionNoFilter = () => {
    setCollectionNoFilter(collectionNoDraft.trim())
    setPage(1)
  }

  const clearCollectionNoFilter = () => {
    setCollectionNoDraft('')
    setCollectionNoFilter('')
    setPage(1)
  }

  const handleExportCurrentPageCsv = () => {
    if (isLoading) {
      toast.error('请等待列表加载完成后再导出')
      return
    }
    if (isError) {
      toast.error('列表加载失败，请先重试后再导出')
      return
    }
    if (items.length === 0) {
      toast.error('当前页没有可导出的记录')
      return
    }
    const body = buildCollectionReviewsCsv(items)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadUtf8Csv(`collection-reviews-page-${page}-${stamp}.csv`, body)
    toast.success(`已导出当前页 ${items.length} 条（CSV）`)
  }

  const handleOpenApprove = (row: CollectionReviewListItem) => {
    setApproveComment('')
    setApproveTarget(row)
  }

  const handleApproveDialogChange = (open: boolean) => {
    if (!open) {
      setApproveTarget(null)
      setApproveComment('')
    }
  }

  const handleConfirmApprove = () => {
    if (!approveTarget) {
      return
    }
    approveMutation.mutate({
      reviewId: approveTarget.reviewId,
      comment: approveComment,
    })
  }

  const handleOpenReject = (row: CollectionReviewListItem) => {
    setRejectReason('')
    setRejectTarget(row)
  }

  const handleRejectDialogChange = (open: boolean) => {
    if (!open) {
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const handleConfirmReject = () => {
    if (!rejectTarget || !rejectReason.trim()) {
      return
    }
    rejectMutation.mutate({
      reviewId: rejectTarget.reviewId,
      reason: rejectReason,
    })
  }

  const handleOpenTakedown = (row: CollectionReviewListItem) => {
    setTakedownReason('')
    setTakedownTarget(row)
  }

  const handleTakedownDialogChange = (open: boolean) => {
    if (!open) {
      setTakedownTarget(null)
      setTakedownReason('')
    }
  }

  const handleConfirmTakedown = () => {
    if (!takedownTarget) {
      return
    }
    takedownMutation.mutate({
      contentVersionId: takedownTarget.contentVersionId,
      reason: takedownReason,
    })
  }

  const handleOpenHistory = (row: CollectionReviewListItem) => {
    setHistoryContext(row)
  }

  const handleHistoryDialogChange = (open: boolean) => {
    if (!open) {
      setHistoryContext(null)
    }
  }

  const isReviewMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    takedownMutation.isPending

  return (
    <>
      <PageLayout>
        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载审核记录…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapListCollectionReviewsErrorMessage(error)}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void refetch()}
            >
              重试
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className='py-8 text-center text-muted-foreground'>
            暂无记录。若当前仅走 M2 同步机审通过，可切换筛选查看「机审已通过」等状态；也可尝试清空藏品编号筛选。
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <DataListIntro
              blocks={[
                {
                  title: '审核记录',
                  description: (
                    <>
                      列表来自审核记录接口；「待人工复核」时可执行人工通过或驳回；「导出当前页
                      CSV」仅导出本页已加载数据。每行可查看该藏品下<strong>当前内容版本</strong>
                      的审核时间线。对「机审/人工已通过」且公开展示仍在线的记录，可执行<strong>下架公开</strong>
                      （内容版本标记为 `TAKEDOWN`，小程序公开展示将提示已下架）。
                    </>
                  ),
                },
              ]}
            />
            {!canOperateReviews ? (
              <AdminReadOnlyNotice description='当前账号仅具备内容复核查看权限，人工通过、驳回与下架动作已隐藏。' />
            ) : null}
            <div
              role='toolbar'
              className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
            >
              <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='review-status-filter' className='text-xs text-muted-foreground'>
                    审核状态
                  </Label>
                  <Select value={reviewStatus} onValueChange={handleReviewStatusChange}>
                    <SelectTrigger id='review-status-filter' className='h-8 w-[200px]'>
                      <SelectValue placeholder='筛选审核状态' />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex min-w-0 flex-col gap-1.5'>
                  <Label htmlFor='collection-no-filter' className='text-xs text-muted-foreground'>
                    按藏品编号（精确）
                  </Label>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      id='collection-no-filter'
                      className='h-8 w-[min(100%,220px)]'
                      placeholder='如 COL-SEED-PENDING-MANUAL'
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
              <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8'
                  disabled={isLoading}
                  title='导出当前列表页为 UTF-8 CSV（含表头与 BOM，便于 Excel 打开）；不含其他分页数据。'
                  onClick={handleExportCurrentPageCsv}
                >
                  导出当前页 CSV
                </Button>
              </div>
            </div>

            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>藏品编号</TableHead>
                    <TableHead>内容版本号</TableHead>
                    <TableHead>审核阶段</TableHead>
                    <TableHead>审核状态</TableHead>
                    <TableHead className='max-w-[220px]'>说明</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className='min-w-[200px] text-end'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const mayTakedown = rowMayTakedownPublish(row)
                    const mayApproveOrReject = row.reviewStatus === 'PENDING_MANUAL'
                    const showTakedownAction = canTakedownReviews && mayTakedown
                    const showApproveAction = canApproveReviews && mayApproveOrReject
                    const showRejectAction = canRejectReviews && mayApproveOrReject

                    return (
                      <TableRow key={row.reviewId}>
                        <TableCell className='font-medium'>
                          {row.collectionNo}
                        </TableCell>
                        <TableCell>v{row.versionNo}</TableCell>
                        <TableCell>{formatReviewStage(row.reviewStage)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.reviewStatus === 'PENDING_MANUAL'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {formatReviewStatus(row.reviewStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className='max-w-[220px] truncate text-muted-foreground text-xs'
                          title={row.reviewReason ?? undefined}
                        >
                          {row.reviewReason?.trim() ? row.reviewReason : '—'}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {formatSubmittedAt(row.submittedAt)}
                        </TableCell>
                        <TableCell className='text-end'>
                          <div className='flex flex-wrap justify-end gap-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              type='button'
                              disabled={isReviewMutating}
                              onClick={() => handleOpenHistory(row)}
                            >
                              审核历史
                            </Button>
                            {showTakedownAction ? (
                              <Button
                                size='sm'
                                variant='secondary'
                                type='button'
                                disabled={isReviewMutating}
                                onClick={() => handleOpenTakedown(row)}
                              >
                                下架公开
                              </Button>
                            ) : null}
                            {mayApproveOrReject ? (
                              <>
                                {showApproveAction ? (
                                  <Button
                                    size='sm'
                                    variant='default'
                                    disabled={isReviewMutating}
                                    onClick={() => handleOpenApprove(row)}
                                  >
                                    人工通过
                                  </Button>
                                ) : null}
                                {showRejectAction ? (
                                  <Button
                                    size='sm'
                                    variant='destructive'
                                    disabled={isReviewMutating}
                                    onClick={() => handleOpenReject(row)}
                                  >
                                    人工驳回
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
                      disabled={page <= 1 || isReviewMutating}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages || isReviewMutating}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
          </div>
        )}
      </PageLayout>

      <Dialog open={!!approveTarget} onOpenChange={handleApproveDialogChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认人工通过</DialogTitle>
            <DialogDescription>
              藏品{' '}
              <span className='font-medium text-foreground'>
                {approveTarget?.collectionNo}
              </span>{' '}
              内容版本 v{approveTarget?.versionNo}
              。通过后该版本将标记为已发布（与后端事务一致）。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='approve-comment'>审核备注（可选）</Label>
            <Textarea
              id='approve-comment'
              rows={3}
              placeholder='可填写通过原因或内部备注'
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              disabled={isReviewMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleApproveDialogChange(false)}
              disabled={isReviewMutating}
            >
              取消
            </Button>
            <Button
              type='button'
              onClick={handleConfirmApprove}
              disabled={isReviewMutating}
            >
              {approveMutation.isPending ? '提交中…' : '确认通过'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={handleRejectDialogChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认人工驳回</DialogTitle>
            <DialogDescription>
              藏品{' '}
              <span className='font-medium text-foreground'>
                {rejectTarget?.collectionNo}
              </span>{' '}
              内容版本 v{rejectTarget?.versionNo}
              。驳回后版本将退回可编辑态且不公开。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='reject-reason'>驳回原因（必填）</Label>
            <Textarea
              id='reject-reason'
              rows={3}
              placeholder='请说明驳回依据，便于会员侧后续修改'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={isReviewMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleRejectDialogChange(false)}
              disabled={isReviewMutating}
            >
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmReject}
              disabled={isReviewMutating || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? '提交中…' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!takedownTarget} onOpenChange={handleTakedownDialogChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>下架公开展示</DialogTitle>
            <DialogDescription>
              将藏品{' '}
              <span className='font-medium text-foreground'>
                {takedownTarget?.collectionNo}
              </span>{' '}
              的内容版本 v{takedownTarget?.versionNo} 标记为下架（
              <code className='text-xs'>TAKEDOWN</code>
              ）。小程序公开展示页将提示已下架。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='takedown-reason'>下架说明（可选）</Label>
            <Textarea
              id='takedown-reason'
              rows={3}
              placeholder='可填写风控或运营备注（当前版本仅随请求发送，后续可接入审计台账）'
              value={takedownReason}
              onChange={(e) => setTakedownReason(e.target.value)}
              disabled={isReviewMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleTakedownDialogChange(false)}
              disabled={isReviewMutating}
            >
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmTakedown}
              disabled={isReviewMutating}
            >
              {takedownMutation.isPending ? '提交中…' : '确认下架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyContext} onOpenChange={handleHistoryDialogChange}>
        <DialogContent className='flex max-h-[85vh] max-w-3xl flex-col overflow-hidden'>
          <DialogHeader>
            <DialogTitle>审核历史</DialogTitle>
            <DialogDescription>
              {historyContext ? (
                <>
                  藏品{' '}
                  <span className='font-medium text-foreground'>
                    {historyContext.collectionNo}
                  </span>
                  ，内容版本 v{historyContext.versionNo}；按记录创建时间从早到晚排列。
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-y-auto'>
            {historyQuery.isLoading ? (
              <p className='py-6 text-center text-muted-foreground text-sm'>正在加载审核历史…</p>
            ) : historyQuery.isError ? (
              <p className='py-6 text-center text-destructive text-sm'>
                {mapCollectionReviewHistoryErrorMessage(historyQuery.error)}
              </p>
            ) : (
              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>记录时间</TableHead>
                      <TableHead>阶段</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead className='max-w-[200px]'>说明</TableHead>
                      <TableHead>审核人</TableHead>
                      <TableHead>完成时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(historyQuery.data?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className='text-center text-muted-foreground text-sm'
                        >
                          暂无审核记录。
                        </TableCell>
                      </TableRow>
                    ) : (
                      (historyQuery.data?.items ?? []).map((h) => (
                        <TableRow key={h.reviewId}>
                          <TableCell className='text-muted-foreground text-xs tabular-nums'>
                            {formatSubmittedAt(h.createdAt)}
                          </TableCell>
                          <TableCell>{formatReviewStage(h.reviewStage)}</TableCell>
                          <TableCell>
                            <Badge variant='outline'>{formatReviewStatus(h.reviewStatus)}</Badge>
                          </TableCell>
                          <TableCell>{formatReviewSource(h.reviewSource)}</TableCell>
                          <TableCell
                            className='max-w-[200px] truncate text-muted-foreground text-xs'
                            title={h.reviewReason ?? undefined}
                          >
                            {h.reviewReason?.trim() ? h.reviewReason : '—'}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-xs'>
                            {h.reviewedByDisplayName?.trim() ? h.reviewedByDisplayName : '—'}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-xs tabular-nums'>
                            {h.reviewedAt != null
                              ? formatSubmittedAt(h.reviewedAt)
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
