import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
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

const reviewRows = [
  {
    collectionNo: 'COL-0001',
    title: '星辉远征纪念页',
    owner: 'member_1024',
    batch: '星辉远征第一批',
    reviewStatus: '待人工复核',
    hitRules: '敏感词 / 图片风险',
  },
  {
    collectionNo: 'COL-0007',
    title: '旧城守望展示页',
    owner: 'member_2024',
    batch: '旧城复苏首发',
    reviewStatus: '人工通过',
    hitRules: '疑似擦边，已放行',
  },
]

export function CollectionReviewsPage() {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>藏品业务 / 内容复核</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>内容复核</h1>
            <p className='text-sm text-muted-foreground'>
              处理机审疑似异常但已公开的藏品内容，并执行人工通过或下架。
            </p>
          </div>
          <Button variant='outline'>导出复核记录</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>待复核内容列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>藏品编号</TableHead>
                  <TableHead>展示标题</TableHead>
                  <TableHead>归属会员</TableHead>
                  <TableHead>所属批次</TableHead>
                  <TableHead>复核状态</TableHead>
                  <TableHead>命中规则</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewRows.map((row) => (
                  <TableRow key={row.collectionNo}>
                    <TableCell className='font-medium'>{row.collectionNo}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.batch}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.reviewStatus === '待人工复核' ? 'secondary' : 'default'
                        }
                      >
                        {row.reviewStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.hitRules}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
