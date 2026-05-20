import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminAuthorizationChangeLogListItem } from '@contracts/admin/system'
import { HistoryIcon, SearchIcon, ShieldIcon } from 'lucide-react'
import { listAuthorizationChangeLogs } from '@/apis/system/system'
import { PageLayout } from '@/components/layout/page-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

type TargetTypeFilter =
  | 'ALL'
  | 'ADMIN_USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'PERMISSION_GROUP'
  | 'MENU'

type ChangeTypeFilter =
  | 'ALL'
  | 'CREATE'
  | 'UPDATE'
  | 'ENABLE'
  | 'DISABLE'
  | 'REPLACE_BINDINGS'
  | 'ASSIGN'
  | 'REVOKE'

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有权限变更日志查看权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatTargetType(value: string): string {
  switch (value) {
    case 'ADMIN_USER':
      return '后台用户'
    case 'ROLE':
      return '角色'
    case 'PERMISSION':
      return '权限点'
    case 'PERMISSION_GROUP':
      return '权限组'
    case 'MENU':
      return '菜单'
    default:
      return value
  }
}

function formatChangeType(value: string): string {
  switch (value) {
    case 'CREATE':
      return '创建'
    case 'UPDATE':
      return '更新'
    case 'ENABLE':
      return '启用'
    case 'DISABLE':
      return '停用'
    case 'REPLACE_BINDINGS':
      return '替换绑定'
    case 'ASSIGN':
      return '授予'
    case 'REVOKE':
      return '撤销'
    default:
      return value
  }
}

function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(value)
}

function formatSnapshot(value: unknown | null): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function AuthorizationChangeLogsPage() {
  const [page, setPage] = useState(1)
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetTypeFilter>('ALL')
  const [changeTypeFilter, setChangeTypeFilter] = useState<ChangeTypeFilter>('ALL')
  const [targetIdInput, setTargetIdInput] = useState('')
  const [selectedChangeLogId, setSelectedChangeLogId] = useState<string | null>(null)

  const logsQuery = useQuery({
    queryKey: [
      'admin',
      'system',
      'authorization-change-logs',
      page,
      targetTypeFilter,
      changeTypeFilter,
      targetIdInput,
    ],
    queryFn: () =>
      listAuthorizationChangeLogs({
        page,
        pageSize: PAGE_SIZE,
        ...(targetTypeFilter === 'ALL' ? {} : { targetType: targetTypeFilter }),
        ...(changeTypeFilter === 'ALL' ? {} : { changeType: changeTypeFilter }),
        ...(targetIdInput.trim() ? { targetId: targetIdInput.trim() } : {}),
      }),
  })

  const logs = logsQuery.data?.items ?? []
  const totalPages = Math.max(
    1,
    Math.ceil((logsQuery.data?.total ?? 0) / (logsQuery.data?.pageSize ?? PAGE_SIZE))
  )

  useEffect(() => {
    setPage(1)
  }, [targetTypeFilter, changeTypeFilter, targetIdInput])

  useEffect(() => {
    if (logs.length === 0) {
      setSelectedChangeLogId(null)
      return
    }

    if (!selectedChangeLogId || !logs.some((item) => item.changeLogId === selectedChangeLogId)) {
      setSelectedChangeLogId(logs[0]?.changeLogId ?? null)
    }
  }, [logs, selectedChangeLogId])

  const selectedLog = useMemo<AdminAuthorizationChangeLogListItem | null>(() => {
    return logs.find((item) => item.changeLogId === selectedChangeLogId) ?? null
  }, [logs, selectedChangeLogId])

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>权限变更日志</h1>
          <p className='text-sm text-muted-foreground'>
            查看后台用户、角色、权限组、权限点与菜单的权限配置变更，便于追溯是谁在什么时候改了什么。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='按目标主键精确筛选'
            value={targetIdInput}
            onChange={(event) => setTargetIdInput(event.target.value)}
          />
        </div>
      </div>

      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Select
          value={targetTypeFilter}
          onValueChange={(value) => setTargetTypeFilter(value as TargetTypeFilter)}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='全部目标类型' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>全部目标类型</SelectItem>
            <SelectItem value='ADMIN_USER'>后台用户</SelectItem>
            <SelectItem value='ROLE'>角色</SelectItem>
            <SelectItem value='PERMISSION'>权限点</SelectItem>
            <SelectItem value='PERMISSION_GROUP'>权限组</SelectItem>
            <SelectItem value='MENU'>菜单</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={changeTypeFilter}
          onValueChange={(value) => setChangeTypeFilter(value as ChangeTypeFilter)}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='全部变更类型' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>全部变更类型</SelectItem>
            <SelectItem value='CREATE'>创建</SelectItem>
            <SelectItem value='UPDATE'>更新</SelectItem>
            <SelectItem value='ENABLE'>启用</SelectItem>
            <SelectItem value='DISABLE'>停用</SelectItem>
            <SelectItem value='REPLACE_BINDINGS'>替换绑定</SelectItem>
            <SelectItem value='ASSIGN'>授予</SelectItem>
            <SelectItem value='REVOKE'>撤销</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>变更记录</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {logsQuery.data?.total ?? 0} 条记录。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void logsQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : logsQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>权限变更日志加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    logsQuery.error,
                    '权限变更日志加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : logs.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配日志</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的权限变更日志，可以调整筛选后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>目标</TableHead>
                      <TableHead>变更</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((row) => (
                      <TableRow
                        key={row.changeLogId}
                        className={cn(
                          'cursor-pointer',
                          row.changeLogId === selectedChangeLogId && 'bg-muted/50'
                        )}
                        onClick={() => setSelectedChangeLogId(row.changeLogId)}
                      >
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='font-medium'>
                                {row.targetName || row.targetId}
                              </span>
                              <Badge variant='secondary'>
                                {row.targetKey || row.targetId}
                              </Badge>
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {formatTargetType(row.targetType)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>
                            {formatChangeType(row.changeType)}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {row.operatorDisplayName} / {row.operatorUsername}
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className='mt-4 flex items-center justify-between gap-2'>
                  <p className='text-sm text-muted-foreground'>
                    第 {logsQuery.data?.page ?? page} / {totalPages} 页
                  </p>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>变更详情</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedLog ? (
              <Alert>
                <AlertTitle>请选择一条日志</AlertTitle>
                <AlertDescription>
                  从左侧选择一条变更记录后，可在这里查看操作人和快照详情。
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <HistoryIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>
                          {selectedLog.targetName || selectedLog.targetId}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedLog.targetKey || selectedLog.targetId}
                      </p>
                    </div>
                    <Badge variant='outline'>
                      {formatChangeType(selectedLog.changeType)}
                    </Badge>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>目标类型：{formatTargetType(selectedLog.targetType)}</p>
                    <p>
                      操作人：{selectedLog.operatorDisplayName} /{' '}
                      {selectedLog.operatorUsername} / {selectedLog.operatorAccountNo}
                    </p>
                    <p>发生时间：{formatDateTime(selectedLog.createdAt)}</p>
                    <p>变更说明：{selectedLog.changeReason || '未填写'}</p>
                  </div>
                </div>

                <Alert>
                  <ShieldIcon className='size-4' />
                  <AlertTitle>审计说明</AlertTitle>
                  <AlertDescription>
                    当前日志记录的是授权配置层面的“输入变化”。例如角色权限与权限组成员保存，会按保存时的绑定结果写入前后快照，方便排查是哪个步骤引入了权限变化。
                  </AlertDescription>
                </Alert>

                <div className='space-y-2 rounded-lg border border-dashed p-4'>
                  <h2 className='text-sm font-medium'>变更前快照</h2>
                  <pre className='overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground'>
                    {formatSnapshot(selectedLog.beforeSnapshot)}
                  </pre>
                </div>

                <div className='space-y-2 rounded-lg border border-dashed p-4'>
                  <h2 className='text-sm font-medium'>变更后快照</h2>
                  <pre className='overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground'>
                    {formatSnapshot(selectedLog.afterSnapshot)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
