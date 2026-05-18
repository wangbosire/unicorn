import { useQuery } from '@tanstack/react-query'
import { BellRing, CircleAlert, Inbox, Send } from 'lucide-react'
import { getNotificationsOverview } from '@/apis/notifications/notifications'
import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatNotificationChannels,
  formatNotificationDispatchStatus,
  formatNotificationTimestamp,
  mapNotificationsOverviewErrorMessage,
} from '@/lib/notifications-display'

export function NotificationsPage() {
  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'notifications', 'overview'],
    queryFn: getNotificationsOverview,
  })

  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>通知中心</h1>
          <p className='text-sm text-muted-foreground'>
            管理站内信、微信通知模板和关键事件的发送通道。
          </p>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载通知中心…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapNotificationsOverviewErrorMessage(error)}
            </p>
            <Button type='button' variant='outline' size='sm' onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>消息总数</CardTitle>
                  <Inbox className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{data?.totalMessages ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    未读 {data?.unreadMessages ?? 0} 条
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>待发送</CardTitle>
                  <BellRing className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{data?.pendingDispatches ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>待异步发送或等待渠道确认</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>发送失败</CardTitle>
                  <CircleAlert className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{data?.failedDispatches ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>可在下方查看失败原因摘要</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>统计生成</CardTitle>
                  <Send className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-sm font-semibold'>
                    {formatNotificationTimestamp(data?.generatedAt ?? null)}
                  </div>
                  <p className='text-xs text-muted-foreground'>基于当前通知消息与派发记录</p>
                </CardContent>
              </Card>
            </div>

            <Card className='mt-4'>
              <CardHeader>
                <CardTitle>通知摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件类型</TableHead>
                      <TableHead>触达渠道</TableHead>
                      <TableHead>最近消息</TableHead>
                      <TableHead>最近状态</TableHead>
                      <TableHead>待发送 / 失败</TableHead>
                      <TableHead>最近成功发送</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.items ?? []).map((row) => (
                      <TableRow key={row.messageType}>
                        <TableCell className='font-medium'>
                          <div className='flex flex-col gap-1'>
                            <span>{row.eventLabel}</span>
                            <span className='text-xs text-muted-foreground'>
                              {row.messageType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatNotificationChannels(row.channels)}</TableCell>
                        <TableCell className='max-w-[320px]'>
                          <div className='flex flex-col gap-1'>
                            <span className='font-medium'>{row.latestTitle}</span>
                            <span
                              className='truncate text-xs text-muted-foreground'
                              title={row.latestContent}
                            >
                              {row.latestContent}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.latestDispatchStatus === 'FAILED'
                                ? 'destructive'
                                : row.latestDispatchStatus === 'PENDING'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {formatNotificationDispatchStatus(row.latestDispatchStatus)}
                          </Badge>
                          {row.latestDispatchNote ? (
                            <p
                              className='mt-1 max-w-[220px] truncate text-xs text-muted-foreground'
                              title={row.latestDispatchNote}
                            >
                              {row.latestDispatchNote}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.pendingDispatches} / {row.failedDispatches}
                        </TableCell>
                        <TableCell>{formatNotificationTimestamp(row.lastSentAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
    </PageLayout>
  )
}
