import { useQuery } from '@tanstack/react-query'
import type { IssuanceBatchListItem } from '@contracts/admin/issuance-batches'
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
import { listIssuanceBatches } from './batches-api'

export function BatchesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'issuance-batches'],
    queryFn: () =>
      listIssuanceBatches({
        page: 1,
        pageSize: 20,
      }),
  })
  const rows = data?.items ?? []

  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>发行管理 / 发行批次</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>发行批次</h1>
            <p className='text-sm text-muted-foreground'>
              按系列定义每次具体发行的数量、状态和领取进度。
            </p>
          </div>
          <Button>新增批次</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>批次列表</CardTitle>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个批次。
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>批次编号</TableHead>
                  <TableHead>批次名称</TableHead>
                  <TableHead>所属系列</TableHead>
                  <TableHead>发行数量</TableHead>
                  <TableHead>激活有效期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center text-muted-foreground'>
                      正在加载批次数据...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center text-destructive'>
                      批次数据加载失败，请稍后重试。
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center text-muted-foreground'>
                      暂无批次数据。
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className='font-medium'>{row.batchNo}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.seriesName}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>
                        {formatBatchTimeRange(row.activateValidFrom, row.activateValidTo)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === 'ENABLED' ? 'default' : 'secondary'
                          }
                        >
                          {toIssuanceBatchStatusLabel(row.status)}
                        </Badge>
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
 * 将批次状态转换为后台展示文案。
 */
function toIssuanceBatchStatusLabel(
  status: IssuanceBatchListItem['status']
): string {
  if (status === 'ENABLED') {
    return '启用'
  }

  if (status === 'DISABLED') {
    return '停用'
  }

  return status
}

/**
 * 将毫秒时间戳范围格式化为后台可读时间段。
 */
function formatBatchTimeRange(from: number, to: number): string {
  return `${formatTimestamp(from)} - ${formatTimestamp(to)}`
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
