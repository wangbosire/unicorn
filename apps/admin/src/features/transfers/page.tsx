import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listTransferOrders } from '@/apis/transfers/transfers'
import { DataListIntro } from '@/components/data-table'
import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  buildTransferOrdersQueryParams,
  formatTransferMode,
  formatTransferReceiver,
  formatTransferStatus,
  formatTransferTimestamp,
  mapListTransferOrdersErrorMessage,
  TRANSFER_MODE_FILTER_ALL,
  TRANSFER_MODE_OPTIONS,
  TRANSFER_STATUS_FILTER_ALL,
  TRANSFER_STATUS_OPTIONS,
} from '@/lib/transfers-display'

export function TransfersPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [status, setStatus] = useState(TRANSFER_STATUS_FILTER_ALL)
  const [transferMode, setTransferMode] = useState(TRANSFER_MODE_FILTER_ALL)
  const [collectionNoDraft, setCollectionNoDraft] = useState('')
  const [collectionNoFilter, setCollectionNoFilter] = useState('')

  const queryParams = useMemo(
    () =>
      buildTransferOrdersQueryParams({
        page,
        pageSize,
        collectionNoFilter,
        status,
        transferMode,
      }),
    [collectionNoFilter, page, pageSize, status, transferMode]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'transfers', queryParams],
    queryFn: () => listTransferOrders(queryParams),
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

  return (
    <PageLayout>
      <div className='mb-6 space-y-1'>
        <h1 className='text-2xl font-bold tracking-tight'>转让记录</h1>
        <p className='text-sm text-muted-foreground'>
          查看真实转让单、转让方式、接收状态和流转去向。
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
          <DataListIntro
            blocks={[
              {
                title: '转让单列表',
                description:
                  '列表已对接真实转让单数据，可按藏品编号、转让方式与转让状态筛选，便于运营追踪流转去向。',
              },
            ]}
          />

          <div
            role='toolbar'
            className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
          >
            <div className='flex min-w-0 flex-1 flex-wrap items-end gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='transfer-status-filter' className='text-xs text-muted-foreground'>
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

              <div className='flex min-w-0 flex-col gap-1.5'>
                <Label htmlFor='transfer-collection-no-filter' className='text-xs text-muted-foreground'>
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
                          <TableHead>发起时间</TableHead>
                          <TableHead>有效期</TableHead>
                          <TableHead>完成时间</TableHead>
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
                                      : 'destructive'
                                }
                              >
                                {formatTransferStatus(row.status)}
                              </Badge>
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
        </div>
      )}
    </PageLayout>
  )
}
