import { useQuery } from '@tanstack/react-query'
import type { ActivationCodeListItem } from '@contracts/admin/activation-codes'
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
import { listActivationCodes } from './activation-codes-api'

export function ActivationCodesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'activation-codes'],
    queryFn: () =>
      listActivationCodes({
        page: 1,
        pageSize: 20,
      }),
  })
  const rows = data?.items ?? []

  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>发行管理 / 激活码管理</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>激活码管理</h1>
            <p className='text-sm text-muted-foreground'>
              查看、导出、发放与作废激活码，并追踪对应藏品编号。
            </p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline'>导出激活码</Button>
            <Button>批量生成</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>激活码列表</CardTitle>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个激活码。
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>激活码</TableHead>
                  <TableHead>所属批次</TableHead>
                  <TableHead>对应藏品</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>失效时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-muted-foreground'>
                      正在加载激活码数据...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-destructive'>
                      激活码数据加载失败，请稍后重试。
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-muted-foreground'>
                      暂无激活码数据。
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className='font-medium'>{row.code}</TableCell>
                      <TableCell>{row.batchName}</TableCell>
                      <TableCell>{row.collectionNo}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === 'UNISSUED' ? 'secondary' : 'default'
                          }
                        >
                          {toActivationCodeStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.expiredAt ? formatTimestamp(row.expiredAt) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}

/**
 * 将激活码状态转换为后台展示文案。
 */
function toActivationCodeStatusLabel(
  status: ActivationCodeListItem['status']
): string {
  switch (status) {
    case 'UNISSUED':
      return '未发放'
    case 'ISSUED':
      return '已发放'
    case 'USED':
      return '已使用'
    case 'VOIDED':
      return '已作废'
    case 'EXPIRED':
      return '已过期'
    default:
      return status
  }
}

/**
 * 将毫秒时间戳格式化为本地可读时间。
 */
function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}
