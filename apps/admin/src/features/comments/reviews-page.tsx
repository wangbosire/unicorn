import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionCommentReviewListItem } from '@contracts/admin/collection-comments'
import { toast } from 'sonner'
import {
  approveCollectionComment,
  blockCollectionComment,
  listCollectionCommentReviews,
  rejectCollectionComment,
} from '@/apis/comments/collection-comments'
import { AdminReadOnlyNotice } from '@/components/admin/admin-readonly-notice'
import { DataListIntro } from '@/components/data-table'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { PageLayout } from '@/components/layout/page-layout'
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
  ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT,
} from '@/lib/admin-route-access'
import {
  buildCollectionCommentReviewsQueryParams,
  COMMENT_STATUS_OPTIONS,
  formatCollectionCommentReviewSource,
  formatCollectionCommentStatus,
  formatCommentTimestamp,
  formatCommentTreeType,
  mapApproveCollectionCommentErrorMessage,
  mapBlockCollectionCommentErrorMessage,
  mapListCollectionCommentReviewsErrorMessage,
  mapRejectCollectionCommentErrorMessage,
  rowMayApproveOrRejectCommentReview,
  rowMayBlockComment,
} from '@/lib/collection-comments-display'

export function CommentReviewsPage() {
  const queryClient = useQueryClient()
  const { hasAnyPermissions } = useAdminPermission()
  const canApproveComments = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE])
  const canRejectComments = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT])
  const canBlockComments = hasAnyPermissions([ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK])
  const canOperateComments =
    canApproveComments || canRejectComments || canBlockComments
  const [reviewStatus, setReviewStatus] = useState('PENDING_MANUAL')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [collectionNoDraft, setCollectionNoDraft] = useState('')
  const [collectionNoFilter, setCollectionNoFilter] = useState('')
  const [approveTarget, setApproveTarget] =
    useState<CollectionCommentReviewListItem | null>(null)
  const [approveComment, setApproveComment] = useState('')
  const [rejectTarget, setRejectTarget] =
    useState<CollectionCommentReviewListItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [blockTarget, setBlockTarget] =
    useState<CollectionCommentReviewListItem | null>(null)
  const [blockReason, setBlockReason] = useState('')

  const queryParams = useMemo(
    () =>
      buildCollectionCommentReviewsQueryParams({
        page,
        pageSize,
        reviewStatus,
        collectionNoFilter,
      }),
    [page, pageSize, reviewStatus, collectionNoFilter]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'collection-comment-reviews', queryParams],
    queryFn: () => listCollectionCommentReviews(queryParams),
  })

  const approveMutation = useMutation({
    mutationFn: (variables: { commentId: string; comment?: string }) =>
      approveCollectionComment(variables.commentId, {
        comment: variables.comment?.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('已通过该评论')
      setApproveTarget(null)
      setApproveComment('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comment-reviews'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comments'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapApproveCollectionCommentErrorMessage(error))
        return
      }
      toast.error('人工通过失败，请稍后重试')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (variables: { commentId: string; reason: string }) =>
      rejectCollectionComment(variables.commentId, {
        reason: variables.reason.trim(),
      }),
    onSuccess: async () => {
      toast.success('已驳回该评论')
      setRejectTarget(null)
      setRejectReason('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comment-reviews'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comments'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapRejectCollectionCommentErrorMessage(error))
        return
      }
      toast.error('人工驳回失败，请稍后重试')
    },
  })

  const blockMutation = useMutation({
    mutationFn: (variables: { commentId: string; reason?: string }) =>
      blockCollectionComment(variables.commentId, {
        reason: variables.reason?.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('已屏蔽该评论')
      setBlockTarget(null)
      setBlockReason('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comment-reviews'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comments'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapBlockCollectionCommentErrorMessage(error))
        return
      }
      toast.error('屏蔽评论失败，请稍后重试')
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const isMutating =
    approveMutation.isPending || rejectMutation.isPending || blockMutation.isPending

  const applyCollectionNoFilter = () => {
    setCollectionNoFilter(collectionNoDraft.trim())
    setPage(1)
  }

  const clearCollectionNoFilter = () => {
    setCollectionNoDraft('')
    setCollectionNoFilter('')
    setPage(1)
  }

  return (
    <>
      <PageLayout>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>评论审核</h1>
            <p className='text-sm text-muted-foreground'>
              处理评论机审疑似异常内容，并支持人工通过、驳回或对已通过评论执行屏蔽。
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载评论审核队列…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapListCollectionCommentReviewsErrorMessage(error)}
            </p>
            <Button type='button' variant='outline' size='sm' onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <DataListIntro
              blocks={[
                {
                  title: '审核队列',
                  description:
                    '默认展示待人工审核评论。对 `PENDING_MANUAL` 可执行人工通过或驳回；对已通过评论可执行屏蔽治理。',
                },
              ]}
            />

            {!canOperateComments ? (
              <AdminReadOnlyNotice description='当前账号仅具备评论查看权限，人工通过、驳回与屏蔽动作已隐藏。' />
            ) : null}

            <div
              role='toolbar'
              className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
            >
              <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='comment-review-status-filter' className='text-xs text-muted-foreground'>
                    审核状态
                  </Label>
                  <Select
                    value={reviewStatus}
                    onValueChange={(value) => {
                      setReviewStatus(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger id='comment-review-status-filter' className='h-8 w-[200px]'>
                      <SelectValue placeholder='筛选审核状态' />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex min-w-0 flex-col gap-1.5'>
                  <Label htmlFor='comment-review-collection-filter' className='text-xs text-muted-foreground'>
                    按藏品编号（精确）
                  </Label>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      id='comment-review-collection-filter'
                      className='h-8 w-[min(100%,220px)]'
                      placeholder='如 COL-SEED-COMMENT-PENDING-MANUAL'
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

            {items.length === 0 ? (
              <div className='py-8 text-center text-muted-foreground'>
                当前筛选条件下暂无评论审核记录。
              </div>
            ) : (
              <>
                <div className='overflow-hidden rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>评论编号</TableHead>
                        <TableHead>藏品编号</TableHead>
                        <TableHead>评论会员</TableHead>
                        <TableHead>评论类型</TableHead>
                        <TableHead>审核状态</TableHead>
                        <TableHead>最新来源</TableHead>
                        <TableHead className='max-w-[240px]'>审核说明</TableHead>
                        <TableHead>提交时间</TableHead>
                        <TableHead className='max-w-[280px]'>评论内容</TableHead>
                        <TableHead className='text-end'>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => {
                        const mayBlock = rowMayBlockComment(row)
                        const mayApproveOrReject = rowMayApproveOrRejectCommentReview(row)
                        const showBlockAction = canBlockComments && mayBlock
                        const showApproveAction = canApproveComments && mayApproveOrReject
                        const showRejectAction = canRejectComments && mayApproveOrReject
                        const showAnyAction =
                          showBlockAction || showApproveAction || showRejectAction

                        return (
                        <TableRow key={row.commentId}>
                          <TableCell className='font-medium'>{row.commentId}</TableCell>
                          <TableCell>{row.collectionNo}</TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span>{row.memberNickname}</span>
                              <span className='text-xs text-muted-foreground'>
                                {row.memberNo}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCommentTreeType(row.isRootComment)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.status === 'PENDING_MANUAL'
                                  ? 'secondary'
                                  : row.status === 'BLOCKED'
                                    ? 'destructive'
                                    : 'outline'
                              }
                            >
                              {formatCollectionCommentStatus(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCollectionCommentReviewSource(row.reviewSource)}</TableCell>
                          <TableCell
                            className='max-w-[240px] truncate text-muted-foreground'
                            title={row.reviewReason ?? undefined}
                          >
                            {row.reviewReason?.trim() ? row.reviewReason : '—'}
                          </TableCell>
                          <TableCell className='text-muted-foreground'>
                            {formatCommentTimestamp(row.createdAt)}
                          </TableCell>
                          <TableCell
                            className='max-w-[280px] truncate text-muted-foreground'
                            title={row.content}
                          >
                            {row.content}
                          </TableCell>
                          <TableCell className='text-end'>
                            <div className='flex flex-wrap justify-end gap-2'>
                              {showBlockAction ? (
                                <Button
                                  size='sm'
                                  variant='secondary'
                                  type='button'
                                  disabled={isMutating}
                                  onClick={() => {
                                    setBlockTarget(row)
                                    setBlockReason('')
                                  }}
                                >
                                  屏蔽评论
                                </Button>
                              ) : null}
                              {mayApproveOrReject ? (
                                <>
                                  {showApproveAction ? (
                                    <Button
                                      size='sm'
                                      variant='default'
                                      disabled={isMutating}
                                      onClick={() => {
                                        setApproveTarget(row)
                                        setApproveComment('')
                                      }}
                                    >
                                      人工通过
                                    </Button>
                                  ) : null}
                                  {showRejectAction ? (
                                    <Button
                                      size='sm'
                                      variant='destructive'
                                      disabled={isMutating}
                                      onClick={() => {
                                        setRejectTarget(row)
                                        setRejectReason('')
                                      }}
                                    >
                                      人工驳回
                                    </Button>
                                  ) : null}
                                </>
                              ) : null}
                              {!showAnyAction ? (
                                <span className='text-xs text-muted-foreground'>—</span>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
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
                      disabled={page <= 1 || isMutating}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages || isMutating}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </PageLayout>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认人工通过</DialogTitle>
            <DialogDescription>
              评论 <span className='font-medium text-foreground'>{approveTarget?.commentId}</span>{' '}
              通过后将进入公开可见状态。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='approve-comment-note'>审核备注（可选）</Label>
            <Textarea
              id='approve-comment-note'
              rows={3}
              placeholder='可填写通过说明或内部备注'
              value={approveComment}
              onChange={(event) => setApproveComment(event.target.value)}
              disabled={isMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={() => setApproveTarget(null)}>
              取消
            </Button>
            <Button
              type='button'
              onClick={() => {
                if (!approveTarget) return
                approveMutation.mutate({
                  commentId: approveTarget.commentId,
                  comment: approveComment,
                })
              }}
              disabled={isMutating}
            >
              {approveMutation.isPending ? '提交中…' : '确认通过'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认人工驳回</DialogTitle>
            <DialogDescription>
              评论 <span className='font-medium text-foreground'>{rejectTarget?.commentId}</span>{' '}
              驳回后将保持不可公开状态。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='reject-comment-reason'>驳回原因（必填）</Label>
            <Textarea
              id='reject-comment-reason'
              rows={3}
              placeholder='请填写驳回原因，便于后续追溯'
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              disabled={isMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={() => setRejectTarget(null)}>
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => {
                if (!rejectTarget || !rejectReason.trim()) return
                rejectMutation.mutate({
                  commentId: rejectTarget.commentId,
                  reason: rejectReason,
                })
              }}
              disabled={isMutating || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? '提交中…' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认屏蔽评论</DialogTitle>
            <DialogDescription>
              评论 <span className='font-medium text-foreground'>{blockTarget?.commentId}</span>{' '}
              屏蔽后将从公开评论区移除。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='block-comment-reason-review'>屏蔽原因（可选）</Label>
            <Textarea
              id='block-comment-reason-review'
              rows={3}
              placeholder='可填写风控或运营备注'
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              disabled={isMutating}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={() => setBlockTarget(null)}>
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => {
                if (!blockTarget) return
                blockMutation.mutate({
                  commentId: blockTarget.commentId,
                  reason: blockReason,
                })
              }}
              disabled={isMutating}
            >
              {blockMutation.isPending ? '提交中…' : '确认屏蔽'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
