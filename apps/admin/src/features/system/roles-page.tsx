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

const roleRows = [
  {
    code: 'role_ops',
    name: '发行运营',
    permissions: '系列 / 批次 / 激活码',
    status: '启用',
  },
  {
    code: 'role_reviewer',
    name: '内容审核员',
    permissions: '内容复核 / 评论审核',
    status: '启用',
  },
]

export function RolesPage() {
  return (
    <PageLayout>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>角色权限</h1>
            <p className='text-sm text-muted-foreground'>
              维护 RBAC 角色、权限范围和后台功能入口授权。
            </p>
          </div>
          <Button>新增角色</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>角色列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>角色编码</TableHead>
                  <TableHead>角色名称</TableHead>
                  <TableHead>权限范围</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleRows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className='font-medium'>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.permissions}</TableCell>
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
