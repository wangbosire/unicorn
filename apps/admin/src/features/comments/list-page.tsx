import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
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

const commentRows = [
  {
    id: 'CMT-0001',
    content: '这张藏品的视觉氛围很强。',
    collectionNo: 'COL-0001',
    member: 'member_1024',
    parent: '-',
    status: '已展示',
  },
  {
    id: 'CMT-0002',
    content: '我也觉得这个系列很有意思。',
    collectionNo: 'COL-0001',
    member: 'member_2050',
    parent: 'CMT-0001',
    status: '已展示',
  },
]

export function CommentListPage() {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>互动与会员 / 评论列表</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>评论列表</h1>
          <p className='text-sm text-muted-foreground'>
            查看一级评论和二级回复，并为后续上下文处理预留入口。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>评论记录</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>评论编号</TableHead>
                  <TableHead>评论内容</TableHead>
                  <TableHead>藏品编号</TableHead>
                  <TableHead>评论会员</TableHead>
                  <TableHead>父评论</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commentRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.id}</TableCell>
                    <TableCell>{row.content}</TableCell>
                    <TableCell>{row.collectionNo}</TableCell>
                    <TableCell>{row.member}</TableCell>
                    <TableCell>{row.parent}</TableCell>
                    <TableCell>
                      <Badge>{row.status}</Badge>
                    </TableCell>
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
