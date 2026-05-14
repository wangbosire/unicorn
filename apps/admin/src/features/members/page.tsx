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

const memberRows = [
  {
    id: 'member_1024',
    nickname: 'Aurora',
    source: '微信小程序',
    collections: 2,
    comments: 3,
    status: '正常',
  },
  {
    id: 'member_2050',
    nickname: 'Echo',
    source: '微信公众号',
    collections: 1,
    comments: 5,
    status: '冻结',
  },
]

export function MembersPage() {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>互动与会员 / 会员管理</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>会员管理</h1>
          <p className='text-sm text-muted-foreground'>
            查看会员授权来源、名下藏品、评论行为和当前账号状态。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>会员列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会员 ID</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>藏品数量</TableHead>
                  <TableHead>评论数量</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.id}</TableCell>
                    <TableCell>{row.nickname}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{row.collections}</TableCell>
                    <TableCell>{row.comments}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === '正常' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
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
