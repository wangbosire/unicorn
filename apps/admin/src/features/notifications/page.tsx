import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const notificationRows = [
  {
    event: '激活成功',
    channel: '站内信 + 小程序',
    template: 'ACTIVATE_SUCCESS',
    status: '启用',
  },
  {
    event: '内容被人工下架',
    channel: '站内信 + 公众号',
    template: 'CONTENT_OFFLINE',
    status: '启用',
  },
]

export function NotificationsPage() {
  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>通知中心</h1>
          <p className='text-sm text-muted-foreground'>
            管理站内信、微信通知模板和关键事件的发送通道。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>通知模板</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事件类型</TableHead>
                  <TableHead>触达渠道</TableHead>
                  <TableHead>模板标识</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationRows.map((row) => (
                  <TableRow key={row.template}>
                    <TableCell className='font-medium'>{row.event}</TableCell>
                    <TableCell>{row.channel}</TableCell>
                    <TableCell>{row.template}</TableCell>
                    <TableCell>
                      <Badge>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </PageLayout>
  )
}
