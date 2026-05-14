import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SeriesListItem } from '@contracts/admin/series'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listSeries } from './series-api'

export function SeriesPage() {
  const [keyword, setKeyword] = useState('')
  const trimmedKeyword = keyword.trim()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'series', trimmedKeyword],
    queryFn: () =>
      listSeries({
        page: 1,
        pageSize: 20,
        ...(trimmedKeyword ? { keyword: trimmedKeyword } : {}),
      }),
  })
  const rows = useMemo(() => data?.items ?? [], [data])

  return (
    <>
      <Header>
        <div className='me-auto'>
          <p className='text-sm text-muted-foreground'>发行管理 / 系列管理</p>
        </div>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>系列管理</h1>
            <p className='text-sm text-muted-foreground'>
              维护数字藏品系列定义、状态和发行规模基线。
            </p>
          </div>
          <Button>新增系列</Button>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 md:grid-cols-3'>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder='搜索系列名称或编号'
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系列列表</CardTitle>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个系列。
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>系列编号</TableHead>
                  <TableHead>系列名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>系列描述</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-muted-foreground'>
                      正在加载系列数据...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-destructive'>
                      系列数据加载失败，请稍后重试。
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center text-muted-foreground'>
                      暂无符合条件的系列。
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className='font-medium'>{row.seriesNo}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === 'ENABLED' ? 'default' : 'secondary'}
                        >
                          {toSeriesStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className='max-w-[320px] truncate'>
                        {row.description}
                      </TableCell>
                      <TableCell>{formatTimestamp(row.createdAt)}</TableCell>
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
 * 将后端返回的系列状态转换为后台展示文案。
 */
function toSeriesStatusLabel(status: SeriesListItem['status']): string {
  if (status === 'ENABLED') {
    return '启用'
  }

  if (status === 'DISABLED') {
    return '停用'
  }

  return status
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
