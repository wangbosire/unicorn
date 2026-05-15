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

const transferRows = [
  {
    id: 'TR-0001',
    collectionNo: 'COL-0001',
    mode: '指定会员',
    from: 'member_1024',
    to: 'member_2050',
    status: '待接收',
  },
  {
    id: 'TR-0002',
    collectionNo: 'COL-0007',
    mode: '转让码',
    from: 'member_3001',
    to: 'member_1988',
    status: '已完成',
  },
]

export function TransfersPage() {
  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>转让记录</h1>
          <p className='text-sm text-muted-foreground'>
            查看藏品转让单、转让方式、接收状态和流转去向。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>转让单列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>转让单号</TableHead>
                  <TableHead>藏品编号</TableHead>
                  <TableHead>转让方式</TableHead>
                  <TableHead>转出会员</TableHead>
                  <TableHead>转入会员</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.id}</TableCell>
                    <TableCell>{row.collectionNo}</TableCell>
                    <TableCell>{row.mode}</TableCell>
                    <TableCell>{row.from}</TableCell>
                    <TableCell>{row.to}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === '待接收' ? 'secondary' : 'default'}>
                        {row.status}
                      </Badge>
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
