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

const commentReviewRows = [
  {
    id: 'CRV-0001',
    comment: '感觉有点擦边，建议复核。',
    collectionNo: 'COL-0009',
    member: 'member_3002',
    status: '待人工审核',
    machine: '图片联想 / 文本风险',
  },
  {
    id: 'CRV-0002',
    comment: '内容正常，等待人工通过。',
    collectionNo: 'COL-0008',
    member: 'member_1988',
    status: '人工通过',
    machine: '疑似异常',
  },
]

export function CommentReviewsPage() {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>互动与会员 / 评论审核</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>评论审核</h1>
            <p className='text-sm text-muted-foreground'>
              处理评论机审疑似异常内容，并支持人工通过或驳回。
            </p>
          </div>
          <Button variant='outline'>批量审核</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>待审核评论</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>审核编号</TableHead>
                  <TableHead>评论内容</TableHead>
                  <TableHead>藏品编号</TableHead>
                  <TableHead>评论会员</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead>机审结果</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commentReviewRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.id}</TableCell>
                    <TableCell>{row.comment}</TableCell>
                    <TableCell>{row.collectionNo}</TableCell>
                    <TableCell>{row.member}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === '待人工审核' ? 'secondary' : 'default'}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.machine}</TableCell>
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
