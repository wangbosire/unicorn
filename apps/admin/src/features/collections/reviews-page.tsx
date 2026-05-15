import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionReviewListItem } from '@contracts/admin/collection-reviews'
import { toast } from 'sonner'
import {
  approveCollectionReview,
  listCollectionReviews,
  rejectCollectionReview,
} from '@/apis/collections/collection-reviews'
import { PageLayout } from '@/components/layout/page-layout'
import { DataListIntro } from '@/components/data-table'
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
import { buildCollectionReviewsCsv, downloadUtf8Csv } from '@/lib/collection-reviews-csv'

const REVIEW_STATUS_FILTER_ALL = '__all__'

/** 审核状态筛选项（值与后端枚举一致）。 */
const REVIEW_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: REVIEW_STATUS_FILTER_ALL, label: '全部状态' },
  { value: 'PENDING_MACHINE', label: '机审待处理' },
  { value: 'MACHINE_APPROVED', label: '机审已通过' },
  { value: 'MACHINE_REJECTED', label: '机审已拒绝' },
  { value: 'PENDING_MANUAL', label: '待人工复核' },
  { value: 'MANUAL_APPROVED', label: '人工已通过' },
  { value: 'MANUAL_REJECTED', label: '人工已拒绝' },
]

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING_MACHINE: '机审待处理',
  MACHINE_APPROVED: '机审已通过',
  MACHINE_REJECTED: '机审已拒绝',
  PENDING_MANUAL: '待人工复核',
  MANUAL_APPROVED: '人工已通过',
  MANUAL_REJECTED: '人工已拒绝',
}

const REVIEW_STAGE_LABELS: Record<string, string> = {
  MACHINE: '机审',
  MANUAL: '人工',
}

function formatReviewStatus(status: string): string {
  return REVIEW_STATUS_LABELS[status] ?? status
}

function formatReviewStage(stage: string): string {
  return REVIEW_STAGE_LABELS[stage] ?? stage
}

function formatSubmittedAt(ms: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return String(ms)
  }
}

function mapApproveReviewErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'REVIEW_RECORD_NOT_FOUND':
      return '审核记录不存在或已删除'
    case 'REVIEW_STATUS_INVALID':
      return '当前状态不允许人工通过（仅「待人工复核」可操作）'
    case 'VALIDATION_ERROR':
      return error.message
    default:
      return error.message || '人工通过失败，请稍后重试'
  }
}

function mapRejectReviewErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'REVIEW_RECORD_NOT_FOUND':
      return '审核记录不存在或已删除'
    case 'REVIEW_STATUS_INVALID':
      return '当前状态不允许人工驳回（仅「待人工复核」可操作）'
    case 'VALIDATION_ERROR':
      return error.message
    default:
      return error.message || '人工驳回失败，请稍后重试'
  }
}

/** 列表加载失败时的可读说明（含鉴权与筛选参数错误）。 */
function mapListCollectionReviewsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_REVIEW_STATUS':
        return '审核状态筛选无效，请改用列表中的筛选项。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「内容复核」权限，请联系管理员开通。'
      default:
        return error.message || '审核记录加载失败，请稍后重试。'
    }
  }
  return '审核记录加载失败，请检查网络后重试。'
}

export function CollectionReviewsPage() {
  const queryClient = useQueryClient()
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

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      ...(reviewStatus !== REVIEW_STATUS_FILTER_ALL
        ? { reviewStatus }
        : {}),
      ...(collectionNoFilter.trim()
        ? { collectionNo: collectionNoFilter.trim() }
        : {}),
    }),
    [page, pageSize, reviewStatus, collectionNoFilter]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'collection-reviews', queryParams],
    queryFn: () => listCollectionReviews(queryParams),
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

  const isReviewMutating =
    approveMutation.isPending || rejectMutation.isPending

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
                      CSV」仅导出本页已加载数据。
                    </>
                  ),
                },
              ]}
            />
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
                      {items.map((row) => (
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
                            {row.reviewStatus === 'PENDING_MANUAL' ? (
                              <div className='flex flex-wrap justify-end gap-2'>
                                <Button
                                  size='sm'
                                  variant='default'
                                  disabled={isReviewMutating}
                                  onClick={() => handleOpenApprove(row)}
                                >
                                  人工通过
                                </Button>
                                <Button
                                  size='sm'
                                  variant='destructive'
                                  disabled={isReviewMutating}
                                  onClick={() => handleOpenReject(row)}
                                >
                                  人工驳回
                                </Button>
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
                            )}
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
    </>
  )
}
