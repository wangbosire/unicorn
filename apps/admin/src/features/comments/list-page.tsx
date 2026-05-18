import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminCollectionCommentListItem } from '@contracts/admin/collection-comments'
import { toast } from 'sonner'
import {
  blockCollectionComment,
  listCollectionComments,
} from '@/apis/comments/collection-comments'
import { DataListIntro } from '@/components/data-table'
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
  buildCollectionCommentsQueryParams,
  COMMENT_STATUS_OPTIONS,
  COMMENT_STATUS_FILTER_ALL,
  formatCollectionCommentStatus,
  formatCommentTimestamp,
  formatCommentTreeType,
  mapBlockCollectionCommentErrorMessage,
  mapListCollectionCommentsErrorMessage,
  rowMayBlockComment,
} from '@/lib/collection-comments-display'

export function CommentListPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(COMMENT_STATUS_FILTER_ALL)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [collectionNoDraft, setCollectionNoDraft] = useState('')
  const [collectionNoFilter, setCollectionNoFilter] = useState('')
  const [blockTarget, setBlockTarget] = useState<AdminCollectionCommentListItem | null>(
    null
  )
  const [blockReason, setBlockReason] = useState('')

  const queryParams = useMemo(
    () =>
      buildCollectionCommentsQueryParams({
        page,
        pageSize,
        status,
        collectionNoFilter,
      }),
    [page, pageSize, status, collectionNoFilter]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'collection-comments', queryParams],
    queryFn: () => listCollectionComments(queryParams),
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
        queryKey: ['admin', 'collection-comments'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'collection-comment-reviews'],
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

  const applyCollectionNoFilter = () => {
    setCollectionNoFilter(collectionNoDraft.trim())
    setPage(1)
  }

  const clearCollectionNoFilter = () => {
    setCollectionNoDraft('')
    setCollectionNoFilter('')
    setPage(1)
  }

  const handleBlockDialogChange = (open: boolean) => {
    if (!open) {
      setBlockTarget(null)
      setBlockReason('')
    }
  }

  const handleConfirmBlock = () => {
    if (!blockTarget) {
      return
    }
    blockMutation.mutate({
      commentId: blockTarget.commentId,
      reason: blockReason,
    })
  }

  return (
    <>
      <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>评论列表</h1>
          <p className='text-sm text-muted-foreground'>
            查看一级评论与二级回复的真实数据，并支持对已通过审核的评论执行屏蔽治理。
          </p>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载评论列表…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapListCollectionCommentsErrorMessage(error)}
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
                  title: '评论治理',
                  description:
                    '列表对接真实评论治理接口，可按藏品编号和评论状态筛选；已通过审核的评论可直接执行屏蔽。',
                },
              ]}
            />

            <div
              role='toolbar'
              className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
            >
              <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='comment-status-filter' className='text-xs text-muted-foreground'>
                    评论状态
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger id='comment-status-filter' className='h-8 w-[200px]'>
                      <SelectValue placeholder='筛选评论状态' />
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
                  <Label htmlFor='comment-collection-no-filter' className='text-xs text-muted-foreground'>
                    按藏品编号（精确）
                  </Label>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      id='comment-collection-no-filter'
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
                当前筛选条件下暂无评论记录。
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
                        <TableHead>回复数</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>发布时间</TableHead>
                        <TableHead className='max-w-[280px]'>评论内容</TableHead>
                        <TableHead className='text-end'>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
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
                          <TableCell>{row.replyCount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={row.status === 'BLOCKED' ? 'destructive' : 'outline'}
                            >
                              {formatCollectionCommentStatus(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-muted-foreground'>
                            {formatCommentTimestamp(row.publishedAt)}
                          </TableCell>
                          <TableCell
                            className='max-w-[280px] truncate text-muted-foreground'
                            title={row.content}
                          >
                            {row.content}
                          </TableCell>
                          <TableCell className='text-end'>
                            {rowMayBlockComment(row) ? (
                              <Button
                                size='sm'
                                variant='destructive'
                                onClick={() => {
                                  setBlockTarget(row)
                                  setBlockReason('')
                                }}
                                disabled={blockMutation.isPending}
                              >
                                屏蔽评论
                              </Button>
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
                      disabled={page <= 1 || blockMutation.isPending}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages || blockMutation.isPending}
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

      <Dialog open={!!blockTarget} onOpenChange={handleBlockDialogChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认屏蔽评论</DialogTitle>
            <DialogDescription>
              评论 <span className='font-medium text-foreground'>{blockTarget?.commentId}</span>{' '}
              一旦屏蔽，将从公开评论列表中隐藏。
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='block-comment-reason'>屏蔽原因（可选）</Label>
            <Textarea
              id='block-comment-reason'
              rows={3}
              placeholder='可填写运营或风控备注'
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              disabled={blockMutation.isPending}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleBlockDialogChange(false)}
              disabled={blockMutation.isPending}
            >
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmBlock}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? '提交中…' : '确认屏蔽'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
