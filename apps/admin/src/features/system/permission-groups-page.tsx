import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminPermissionGroupDetail,
  AdminPermissionGroupListItem,
  AdminPermissionListItem,
} from '@contracts/admin/system'
import { CircleAlertIcon, SearchIcon, ShieldIcon } from 'lucide-react'
import {
  getPermissionGroup,
  listPermissionGroups,
  listPermissions,
  updatePermissionGroupPermissions,
} from '@/apis/system/system'
import { AdminPermissionGuard } from '@/components/admin/admin-permission-guard'
import { AdminReadOnlyNotice } from '@/components/admin/admin-readonly-notice'
import { PageLayout } from '@/components/layout/page-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE } from '@/lib/admin-route-access'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const LIST_PAGE_SIZE = 200
const PERMISSION_PAGE_SIZE = 400

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有权限组查看权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      case 'PERMISSION_DISABLED':
        return '所选权限点中存在已停用项，请取消后重试。'
      case 'PERMISSION_WILDCARD_FORBIDDEN':
        return '超级管理员通配权限不可归入权限组，请取消后重试。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatGroupStatus(status: string): string {
  return status === 'ENABLED' ? '启用' : '停用'
}

function formatGroupType(groupType: string): string {
  switch (groupType) {
    case 'SYSTEM':
      return '系统域'
    case 'MENU':
      return '菜单域'
    case 'BUSINESS':
      return '业务域'
    default:
      return groupType
  }
}

function buildCoverageLabel(group: Pick<AdminPermissionGroupListItem, 'permissionCount' | 'menuCount'>) {
  return `权限点 ${group.permissionCount} 项 · 菜单 ${group.menuCount} 项`
}

export function PermissionGroupsPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAdminPermission()
  const canUpdatePermissionGroups = hasPermission(
    ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE
  )
  const [searchInput, setSearchInput] = useState('')
  const [selectedPermissionGroupId, setSelectedPermissionGroupId] = useState<string | null>(
    null
  )
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])

  const permissionGroupsQuery = useQuery({
    queryKey: ['admin', 'system', 'permission-groups', searchInput],
    queryFn: () =>
      listPermissionGroups({
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
      }),
  })

  const permissionGroups = permissionGroupsQuery.data?.items ?? []

  useEffect(() => {
    if (permissionGroups.length === 0) {
      setSelectedPermissionGroupId(null)
      return
    }

    if (
      !selectedPermissionGroupId ||
      !permissionGroups.some(
        (item) => item.permissionGroupId === selectedPermissionGroupId
      )
    ) {
      setSelectedPermissionGroupId(permissionGroups[0]?.permissionGroupId ?? null)
    }
  }, [permissionGroups, selectedPermissionGroupId])

  const permissionGroupDetailQuery = useQuery({
    queryKey: ['admin', 'system', 'permission-group', selectedPermissionGroupId],
    queryFn: () => getPermissionGroup(selectedPermissionGroupId ?? ''),
    enabled: !!selectedPermissionGroupId,
  })

  const permissionsQuery = useQuery({
    queryKey: ['admin', 'system', 'permissions', 'all-for-groups'],
    queryFn: () =>
      listPermissions({
        page: 1,
        pageSize: PERMISSION_PAGE_SIZE,
      }),
  })

  const selectedGroupSummary = useMemo<AdminPermissionGroupListItem | null>(() => {
    return (
      permissionGroups.find(
        (item) => item.permissionGroupId === selectedPermissionGroupId
      ) ?? null
    )
  }, [permissionGroups, selectedPermissionGroupId])

  const selectedGroupDetail =
    permissionGroupDetailQuery.data as AdminPermissionGroupDetail | undefined
  const permissions = permissionsQuery.data?.items ?? []

  useEffect(() => {
    if (!selectedGroupDetail) {
      setSelectedPermissionIds([])
      return
    }

    setSelectedPermissionIds(
      selectedGroupDetail.permissions.map((permission) => permission.permissionId).sort()
    )
  }, [selectedGroupDetail])

  const updatePermissionGroupPermissionsMutation = useMutation({
    mutationFn: (variables: {
      permissionGroupId: string
      permissionIds: string[]
    }) =>
      updatePermissionGroupPermissions(variables.permissionGroupId, {
        permissionIds: variables.permissionIds,
        changeReason: null,
      }),
    onSuccess: async (result) => {
      toast.success('权限组成员已保存')
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'permission-groups'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'permission-group', result.permissionGroupId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'permissions'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(
        mapSystemErrorMessage(error, '保存权限组成员失败，请稍后重试。')
      )
    },
  })

  const selectedPermissionSignature = [...selectedPermissionIds].sort().join('|')
  const initialPermissionSignature = (
    selectedGroupDetail?.permissions.map((permission) => permission.permissionId) ?? []
  )
    .sort()
    .join('|')
  const permissionSelectionDirty =
    selectedGroupDetail !== undefined &&
    selectedPermissionSignature !== initialPermissionSignature

  const boundDisabledPermissionIds = new Set(
    selectedGroupDetail?.permissions
      .filter((permission) => permission.status !== 'ENABLED')
      .map((permission) => permission.permissionId) ?? []
  )

  const handleTogglePermission = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      if (checked) {
        return [...new Set([...current, permissionId])].sort()
      }

      return current.filter((item) => item !== permissionId)
    })
  }

  const handleSavePermissions = () => {
    if (!selectedPermissionGroupId) return

    updatePermissionGroupPermissionsMutation.mutate({
      permissionGroupId: selectedPermissionGroupId,
      permissionIds: selectedPermissionIds,
    })
  }

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>权限组</h1>
          <p className='text-sm text-muted-foreground'>
            查看 action 聚合、菜单绑定覆盖范围和异常配置，作为角色授权与菜单可见性的阅读入口。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='搜索权限组 key、名称、说明'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>权限组列表</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {permissionGroupsQuery.data?.total ?? 0} 个权限组。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void permissionGroupsQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {permissionGroupsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : permissionGroupsQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>权限组列表加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    permissionGroupsQuery.error,
                    '权限组列表加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : permissionGroups.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配权限组</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的权限组，可以尝试清空搜索后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>权限组</TableHead>
                    <TableHead>覆盖范围</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionGroups.map((row) => {
                    const hasNoPermissions = row.permissionCount === 0
                    const hasNoMenus = row.menuCount === 0

                    return (
                      <TableRow
                        key={row.permissionGroupId}
                        className={cn(
                          'cursor-pointer',
                          row.permissionGroupId === selectedPermissionGroupId &&
                            'bg-muted/50'
                        )}
                        onClick={() => setSelectedPermissionGroupId(row.permissionGroupId)}
                      >
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='font-medium'>{row.groupName}</span>
                              <Badge variant='secondary'>{row.groupKey}</Badge>
                              {row.isBuiltin ? <Badge variant='outline'>内置</Badge> : null}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {row.description || '未填写权限组说明。'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          <div className='space-y-1'>
                            <p>{buildCoverageLabel(row)}</p>
                            <p>类型 {formatGroupType(row.groupType)}</p>
                            {hasNoPermissions ? (
                              <p className='text-amber-600'>空权限组，当前不会赋予任何 action。</p>
                            ) : null}
                            {hasNoMenus ? (
                              <p className='text-amber-600'>未绑定菜单，只能通过角色授权间接生效。</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            <Badge
                              variant={row.status === 'ENABLED' ? 'default' : 'outline'}
                            >
                              {formatGroupStatus(row.status)}
                            </Badge>
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
            <CardTitle>权限组详情</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedGroupSummary ? (
              <Alert>
                <AlertTitle>请选择权限组</AlertTitle>
                <AlertDescription>
                  从左侧选择一个权限组后，可在这里查看它覆盖的 action 和菜单绑定。
                </AlertDescription>
              </Alert>
            ) : permissionGroupDetailQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-28 w-full' />
                <Skeleton className='h-28 w-full' />
              </div>
            ) : permissionGroupDetailQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>权限组详情加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    permissionGroupDetailQuery.error,
                    '权限组详情加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : selectedGroupDetail ? (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <ShieldIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>{selectedGroupDetail.groupName}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedGroupDetail.groupKey}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <Badge
                        variant={
                          selectedGroupDetail.status === 'ENABLED'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {formatGroupStatus(selectedGroupDetail.status)}
                      </Badge>
                      {selectedGroupDetail.isBuiltin ? (
                        <Badge variant='secondary'>内置</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>类型：{formatGroupType(selectedGroupDetail.groupType)}</p>
                    <p>说明：{selectedGroupDetail.description || '未填写权限组说明。'}</p>
                    <p>权限点：{selectedGroupDetail.permissions.length} 项</p>
                    <p>菜单绑定：{selectedGroupDetail.menus.length} 项</p>
                  </div>
                </div>

                {selectedGroupDetail.status !== 'ENABLED' ? (
                  <Alert>
                    <ShieldIcon className='size-4' />
                    <AlertTitle>当前权限组已停用</AlertTitle>
                    <AlertDescription>
                      角色授权时不应继续分配该组；若某菜单仅绑定此组，运行时会被自动隐藏。
                    </AlertDescription>
                  </Alert>
                ) : null}

                {boundDisabledPermissionIds.size > 0 ? (
                  <Alert>
                    <CircleAlertIcon className='size-4' />
                    <AlertTitle>检测到失效权限点绑定</AlertTitle>
                    <AlertDescription>
                      当前权限组包含已停用权限点。运行时这些 action 不应继续放行，本次可取消勾选后重新保存。
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selectedGroupDetail.permissions.length === 0 ? (
                  <Alert>
                    <CircleAlertIcon className='size-4' />
                    <AlertTitle>当前为空权限组</AlertTitle>
                    <AlertDescription>
                      该权限组暂未聚合任何 action。它不会直接为角色带来接口放行能力，建议后续在角色权限页补齐或清理。
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className='space-y-2 rounded-lg border border-dashed p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>包含的权限点</h2>
                      <p className='text-xs text-muted-foreground'>
                        角色授权保存时，系统会把该组内 action 展开后写入最终 `role_permissions`。
                      </p>
                    </div>
                    <Badge variant='outline'>
                      {selectedPermissionIds.length} 项
                    </Badge>
                  </div>
                  <AdminPermissionGuard
                    anyOfPermissions={[ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE]}
                    fallback={
                      <AdminReadOnlyNotice description='当前账号仅可查看权限组覆盖范围；如需调整成员，请联系具备 permission_groups.update 权限的管理员。' />
                    }
                  >
                    <div className='space-y-2'>
                      {permissionsQuery.isLoading ? (
                        <>
                          <Skeleton className='h-12 w-full' />
                          <Skeleton className='h-12 w-full' />
                        </>
                      ) : permissionsQuery.isError ? (
                        <Alert variant='destructive'>
                          <AlertTitle>权限点全集加载失败</AlertTitle>
                          <AlertDescription>
                            {mapSystemErrorMessage(
                              permissionsQuery.error,
                              '权限点全集加载失败，请稍后重试。'
                            )}
                          </AlertDescription>
                        </Alert>
                      ) : permissions.length === 0 ? (
                        <p className='text-sm text-muted-foreground'>当前没有可选权限点。</p>
                      ) : (
                        permissions.map((permission: AdminPermissionListItem) => {
                          const checked = selectedPermissionIds.includes(permission.permissionId)
                          const disabled =
                            !canUpdatePermissionGroups ||
                            permission.status !== 'ENABLED' ||
                            permission.permissionKey === '*'
                          const showsDisabledBindingWarning = boundDisabledPermissionIds.has(
                            permission.permissionId
                          )

                          return (
                            <label
                              key={permission.permissionId}
                              className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                                checked && 'border-primary/50 bg-primary/5',
                                disabled && !checked && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={disabled && !checked}
                                onCheckedChange={(value) =>
                                  handleTogglePermission(
                                    permission.permissionId,
                                    Boolean(value)
                                  )
                                }
                              />
                              <div className='min-w-0 flex-1 space-y-1'>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <span className='font-medium'>
                                    {permission.permissionName}
                                  </span>
                                  <Badge variant='secondary'>
                                    {permission.permissionKey}
                                  </Badge>
                                  <Badge variant='outline'>
                                    {permission.permissionType}
                                  </Badge>
                                  {permission.isBuiltin ? (
                                    <Badge variant='outline'>内置</Badge>
                                  ) : null}
                                  {permission.permissionKey === '*' ? (
                                    <Badge variant='destructive'>仅角色直授</Badge>
                                  ) : null}
                                  {showsDisabledBindingWarning ? (
                                    <Badge variant='destructive'>失效绑定</Badge>
                                  ) : null}
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                  {permission.description || '未填写权限说明。'}
                                </p>
                                <p className='text-xs text-muted-foreground'>
                                  已归属权限组 {permission.groupCount} 项 · 状态 {permission.status}
                                </p>
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
                  </AdminPermissionGuard>

                  <AdminPermissionGuard
                    anyOfPermissions={[ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE]}
                  >
                    <div className='flex items-center justify-end gap-2 pt-2'>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() =>
                          setSelectedPermissionIds(
                            selectedGroupDetail.permissions
                              .map((permission) => permission.permissionId)
                              .sort()
                          )
                        }
                        disabled={
                          !permissionSelectionDirty ||
                          updatePermissionGroupPermissionsMutation.isPending
                        }
                      >
                        重置
                      </Button>
                      <Button
                        type='button'
                        onClick={handleSavePermissions}
                        disabled={
                          !permissionSelectionDirty ||
                          updatePermissionGroupPermissionsMutation.isPending
                        }
                      >
                        保存成员
                      </Button>
                    </div>
                  </AdminPermissionGuard>
                </div>

                <div className='space-y-2 rounded-lg border border-dashed p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>命中的菜单</h2>
                      <p className='text-xs text-muted-foreground'>
                        菜单层按 `anyOf` 语义命中权限组。只要用户拥有该组任一有效 action，对应菜单即可展示。
                      </p>
                    </div>
                    <Badge variant='outline'>{selectedGroupDetail.menus.length} 项</Badge>
                  </div>
                  {selectedGroupDetail.menus.length === 0 ? (
                    <Alert>
                      <AlertTitle>当前未绑定菜单</AlertTitle>
                      <AlertDescription>
                        这类权限组不会直接出现在导航里。若这是页面域权限组，请后续在
                        <Link to='/system/menus' className='mx-1 underline underline-offset-4'>
                          菜单权限
                        </Link>
                        页补齐绑定。
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className='space-y-2'>
                      {selectedGroupDetail.menus.map((menu) => (
                        <div key={menu.menuId} className='rounded-lg border p-3'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-medium'>{menu.menuName}</span>
                            <Badge variant='secondary'>{menu.menuKey}</Badge>
                            <Badge variant='outline'>{menu.menuType}</Badge>
                            {menu.status !== 'ENABLED' ? (
                              <Badge variant='destructive'>菜单停用</Badge>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground'>
                  <p>
                    巡检建议：若发现“空权限组 + 未绑定菜单”，通常说明这是未收口的配置草稿；若发现“已停用权限组仍绑定菜单”，运行时虽然会隐藏，但仍建议在
                    <Link to='/system/menus' className='mx-1 underline underline-offset-4'>
                      菜单权限
                    </Link>
                    页清理。
                  </p>
                  <p className='mt-2'>
                    若需查看该组最终如何影响角色授权，可前往
                    <Link to='/system/roles' className='mx-1 underline underline-offset-4'>
                      角色权限
                    </Link>
                    页检查组展开后的 action 集。
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
