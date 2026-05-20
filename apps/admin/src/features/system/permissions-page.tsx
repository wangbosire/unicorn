import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type {
  AdminPermissionDetail,
  AdminPermissionListItem,
} from '@contracts/admin/system'
import {
  CircleAlertIcon,
  KeyRoundIcon,
  SearchIcon,
  ShieldIcon,
} from 'lucide-react'
import { getPermission, listPermissions } from '@/apis/system/system'
import { PageLayout } from '@/components/layout/page-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

const LIST_PAGE_SIZE = 200

type PermissionStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED'
type PermissionTypeFilter = 'ALL' | 'ACTION' | 'PAGE'

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有权限点查看权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatPermissionStatus(status: string): string {
  return status === 'ENABLED' ? '启用' : '停用'
}

function formatPermissionType(permissionType: string): string {
  switch (permissionType) {
    case 'ACTION':
      return '动作权限'
    case 'PAGE':
      return '页面权限'
    default:
      return permissionType
  }
}

export function PermissionsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<PermissionStatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<PermissionTypeFilter>('ALL')
  const [orphanOnly, setOrphanOnly] = useState(false)
  const [selectedPermissionId, setSelectedPermissionId] = useState<string | null>(null)

  const permissionsQuery = useQuery({
    queryKey: [
      'admin',
      'system',
      'permissions',
      searchInput,
      statusFilter,
      typeFilter,
      orphanOnly,
    ],
    queryFn: () =>
      listPermissions({
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
        ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
        ...(typeFilter === 'ALL' ? {} : { permissionType: typeFilter }),
        ...(orphanOnly ? { orphanOnly: true } : {}),
      }),
  })

  const permissions = permissionsQuery.data?.items ?? []

  useEffect(() => {
    if (permissions.length === 0) {
      setSelectedPermissionId(null)
      return
    }

    if (
      !selectedPermissionId ||
      !permissions.some((item) => item.permissionId === selectedPermissionId)
    ) {
      setSelectedPermissionId(permissions[0]?.permissionId ?? null)
    }
  }, [permissions, selectedPermissionId])

  const permissionDetailQuery = useQuery({
    queryKey: ['admin', 'system', 'permission', selectedPermissionId],
    queryFn: () => getPermission(selectedPermissionId ?? ''),
    enabled: !!selectedPermissionId,
  })

  const selectedPermissionSummary = useMemo<AdminPermissionListItem | null>(() => {
    return (
      permissions.find((item) => item.permissionId === selectedPermissionId) ?? null
    )
  }, [permissions, selectedPermissionId])

  const selectedPermissionDetail =
    permissionDetailQuery.data as AdminPermissionDetail | undefined
  const disabledGroupCount =
    selectedPermissionDetail?.groups.filter((group) => group.status !== 'ENABLED')
      .length ?? 0

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>权限点</h1>
          <p className='text-sm text-muted-foreground'>
            查看 action 级真相源、孤儿权限和权限组归属，作为角色授权与菜单配置的底层巡检面板。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='搜索权限 key、名称'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as PermissionStatusFilter)}
        >
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder='全部状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>全部状态</SelectItem>
            <SelectItem value='ENABLED'>仅看启用</SelectItem>
            <SelectItem value='DISABLED'>仅看停用</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as PermissionTypeFilter)}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='全部类型' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>全部类型</SelectItem>
            <SelectItem value='ACTION'>动作权限</SelectItem>
            <SelectItem value='PAGE'>页面权限</SelectItem>
          </SelectContent>
        </Select>
        <label className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Checkbox
            checked={orphanOnly}
            onCheckedChange={(checked) => setOrphanOnly(Boolean(checked))}
          />
          仅看孤儿权限
        </label>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>权限点列表</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {permissionsQuery.data?.total ?? 0} 个权限点。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void permissionsQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {permissionsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : permissionsQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>权限点列表加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    permissionsQuery.error,
                    '权限点列表加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : permissions.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配权限点</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的权限点，可以尝试清空搜索或关闭孤儿筛选后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>权限点</TableHead>
                    <TableHead>归属</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((row) => {
                    const isOrphan = row.groupCount === 0

                    return (
                      <TableRow
                        key={row.permissionId}
                        className={cn(
                          'cursor-pointer',
                          row.permissionId === selectedPermissionId && 'bg-muted/50'
                        )}
                        onClick={() => setSelectedPermissionId(row.permissionId)}
                      >
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='font-medium'>{row.permissionName}</span>
                              <Badge variant='secondary'>{row.permissionKey}</Badge>
                              <Badge variant='outline'>
                                {formatPermissionType(row.permissionType)}
                              </Badge>
                              {row.isBuiltin ? <Badge variant='outline'>内置</Badge> : null}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {row.description || '未填写权限说明。'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          <div className='space-y-1'>
                            <p>权限组 {row.groupCount} 项</p>
                            {isOrphan ? (
                              <p className='text-amber-600'>
                                孤儿 action，不会自动出现在菜单或权限组主列表里。
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            <Badge
                              variant={row.status === 'ENABLED' ? 'default' : 'outline'}
                            >
                              {formatPermissionStatus(row.status)}
                            </Badge>
                            {isOrphan ? (
                              <Badge variant='destructive'>孤儿</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限点详情</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedPermissionSummary ? (
              <Alert>
                <AlertTitle>请选择权限点</AlertTitle>
                <AlertDescription>
                  从左侧选择一个权限点后，可在这里查看它归属的权限组和异常状态。
                </AlertDescription>
              </Alert>
            ) : permissionDetailQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-28 w-full' />
              </div>
            ) : permissionDetailQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>权限点详情加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    permissionDetailQuery.error,
                    '权限点详情加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : selectedPermissionDetail ? (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <KeyRoundIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>
                          {selectedPermissionDetail.permissionName}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedPermissionDetail.permissionKey}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <Badge
                        variant={
                          selectedPermissionDetail.status === 'ENABLED'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {formatPermissionStatus(selectedPermissionDetail.status)}
                      </Badge>
                      <Badge variant='outline'>
                        {formatPermissionType(selectedPermissionDetail.permissionType)}
                      </Badge>
                      {selectedPermissionDetail.isBuiltin ? (
                        <Badge variant='secondary'>内置</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>说明：{selectedPermissionDetail.description || '未填写权限说明。'}</p>
                    <p>归属权限组：{selectedPermissionDetail.groups.length} 项</p>
                  </div>
                </div>

                {selectedPermissionDetail.groups.length === 0 ? (
                  <Alert>
                    <CircleAlertIcon className='size-4' />
                    <AlertTitle>检测到孤儿 action</AlertTitle>
                    <AlertDescription>
                      当前权限点未归属任何权限组。按照现有规则，它仍可作为底层授权对象存在，但不会自动进入菜单体系或权限组主视图。
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selectedPermissionDetail.status !== 'ENABLED' ? (
                  <Alert>
                    <ShieldIcon className='size-4' />
                    <AlertTitle>当前权限点已停用</AlertTitle>
                    <AlertDescription>
                      运行时命中已停用 action 时不应放行。若角色仍保留该 action，建议后续在角色权限页做收敛。
                    </AlertDescription>
                  </Alert>
                ) : null}

                {disabledGroupCount > 0 ? (
                  <Alert>
                    <ShieldIcon className='size-4' />
                    <AlertTitle>存在失效权限组归属</AlertTitle>
                    <AlertDescription>
                      当前权限点归属了 {disabledGroupCount} 个已停用权限组。角色侧仍可能引用该 action，但菜单展示面不会再按这些组计算可见性。
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className='space-y-2 rounded-lg border border-dashed p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>归属的权限组</h2>
                      <p className='text-xs text-muted-foreground'>
                        权限组只负责展示、菜单绑定和批量勾选；最终接口放行仍由 action 级权限决定。
                      </p>
                    </div>
                    <Badge variant='outline'>
                      {selectedPermissionDetail.groups.length} 项
                    </Badge>
                  </div>
                  {selectedPermissionDetail.groups.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>当前没有权限组归属。</p>
                  ) : (
                    <div className='space-y-2'>
                      {selectedPermissionDetail.groups.map((group) => (
                        <div key={group.permissionGroupId} className='rounded-lg border p-3'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-medium'>{group.groupName}</span>
                            <Badge variant='secondary'>{group.groupKey}</Badge>
                            {group.status !== 'ENABLED' ? (
                              <Badge variant='destructive'>权限组停用</Badge>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground'>
                  <p>
                    巡检建议：若看到孤儿 action，优先判断它是“尚未建组的新能力”还是“遗留兼容 key”。前者建议后续在
                    <Link
                      to='/system/permission-groups'
                      className='mx-1 underline underline-offset-4'
                    >
                      权限组
                    </Link>
                    页建立归属；后者建议在迁移完成后清理。
                  </p>
                  <p className='mt-2'>
                    若需观察该 action 如何被角色消费，可去
                    <Link to='/system/roles' className='mx-1 underline underline-offset-4'>
                      角色权限
                    </Link>
                    页核对组展开后的结果。
                  </p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
