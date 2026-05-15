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

const collectionRows = [
  {
    no: 'COL-0001',
    series: '星辉远征',
    batch: '星辉远征第一批',
    owner: 'member_1024',
    collectionStatus: '已领取',
    contentStatus: '已公开',
    reviewStatus: '人工通过',
  },
  {
    no: 'COL-0002',
    series: '星辉远征',
    batch: '星辉远征第一批',
    owner: '-',
    collectionStatus: '待领取',
    contentStatus: '草稿',
    reviewStatus: '待机审',
  },
]

export function CollectionListPage() {
  return (
    <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>藏品列表</h1>
          <p className='text-sm text-muted-foreground'>
            聚合查看藏品资产、归属会员、发布状态与审核状态。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>藏品资产列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>藏品编号</TableHead>
                  <TableHead>系列</TableHead>
                  <TableHead>发行批次</TableHead>
                  <TableHead>归属会员</TableHead>
                  <TableHead>藏品状态</TableHead>
                  <TableHead>内容状态</TableHead>
                  <TableHead>审核状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectionRows.map((row) => (
                  <TableRow key={row.no}>
                    <TableCell className='font-medium'>{row.no}</TableCell>
                    <TableCell>{row.series}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>
                      <Badge variant={row.collectionStatus === '已领取' ? 'default' : 'secondary'}>
                        {row.collectionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.contentStatus}</TableCell>
                    <TableCell>{row.reviewStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </PageLayout>
  )
}
