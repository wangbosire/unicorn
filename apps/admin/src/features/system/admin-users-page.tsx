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

const adminUserRows = [
  {
    id: 'admin_001',
    name: '运营管理员',
    role: '发行运营',
    status: '启用',
  },
  {
    id: 'admin_002',
    name: '审核专员',
    role: '内容审核员',
    status: '启用',
  },
]

export function AdminUsersPage() {
  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>系统管理 / 后台用户</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>后台用户</h1>
            <p className='text-sm text-muted-foreground'>
              维护后台账号、角色归属和账号启停用状态。
            </p>
          </div>
          <Button>新增后台用户</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>后台账号列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>账号编号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUserRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.role}</TableCell>
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
