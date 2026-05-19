import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminPermissionGroupDetail,
  AdminPermissionGroupListItem,
  AdminRoleListItem,
} from '@contracts/admin/system'
import { KeyRoundIcon, SearchIcon, ShieldIcon } from 'lucide-react'
import {
  getPermissionGroup,
  getRole,
  listPermissionGroups,
  listRoles,
  updateRolePermissions,
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
import { ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS } from '@/lib/admin-route-access'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

const LIST_PAGE_SIZE = 100
const GROUP_PAGE_SIZE = 200

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有角色权限管理权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      case 'PERMISSION_GROUP_DISABLED':
        return '所选权限组中存在已停用项，请刷新列表后重试。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatRoleStatus(status: string): string {
  return status === 'ENABLED' ? '启用' : '停用'
}

function derivePermissionSelection(params: {
  rolePermissionIds: string[]
  groupDetails: AdminPermissionGroupDetail[]
}) {
  const rolePermissionSet = new Set(params.rolePermissionIds)
  const selectedPermissionGroupIds = params.groupDetails
    .filter(
      (group) =>
        group.permissions.length > 0 &&
        group.permissions.every((permission) => rolePermissionSet.has(permission.permissionId))
    )
    .map((group) => group.permissionGroupId)
    .sort()

  const coveredPermissionIds = new Set<string>()
  for (const group of params.groupDetails) {
    if (!selectedPermissionGroupIds.includes(group.permissionGroupId)) {
      continue
    }
    for (const permission of group.permissions) {
      coveredPermissionIds.add(permission.permissionId)
    }
  }

  const extraPermissionIds = params.rolePermissionIds
    .filter((permissionId) => !coveredPermissionIds.has(permissionId))
    .sort()

  return {
    selectedPermissionGroupIds,
    extraPermissionIds,
  }
}

export function RolesPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const resetAuth = useAuthStore((state) => state.auth.reset)
  const { hasPermission } = useAdminPermission()
  const canAssignPermissions = hasPermission(
    ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS
  )
  const [searchInput, setSearchInput] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedPermissionGroupIds, setSelectedPermissionGroupIds] = useState<string[]>([])
  const [extraPermissionIds, setExtraPermissionIds] = useState<string[]>([])
  const [initialSelectionSignature, setInitialSelectionSignature] = useState('')

  const rolesQuery = useQuery({
    queryKey: ['admin', 'system', 'roles', searchInput],
    queryFn: () =>
      listRoles({
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
      }),
  })

  const permissionGroupsQuery = useQuery({
    queryKey: ['admin', 'system', 'permission-groups', 'all'],
    queryFn: () =>
      listPermissionGroups({
        page: 1,
        pageSize: GROUP_PAGE_SIZE,
      }),
  })

  const roles = rolesQuery.data?.items ?? []
  const permissionGroups = permissionGroupsQuery.data?.items ?? []

  useEffect(() => {
    if (roles.length === 0) {
      setSelectedRoleId(null)
      return
    }

    if (!selectedRoleId || !roles.some((item) => item.roleId === selectedRoleId)) {
      setSelectedRoleId(roles[0]?.roleId ?? null)
    }
  }, [roles, selectedRoleId])

  const roleDetailQuery = useQuery({
    queryKey: ['admin', 'system', 'role', selectedRoleId],
    queryFn: () => getRole(selectedRoleId ?? ''),
    enabled: !!selectedRoleId,
  })

  const permissionGroupDetailQueries = useQueries({
    queries: permissionGroups.map((group: AdminPermissionGroupListItem) => ({
      queryKey: ['admin', 'system', 'permission-group', group.permissionGroupId],
      queryFn: () => getPermissionGroup(group.permissionGroupId),
      enabled: permissionGroups.length > 0,
      staleTime: 60_000,
    })),
  })

  const permissionGroupDetails = useMemo<AdminPermissionGroupDetail[]>(() => {
    return permissionGroupDetailQueries
      .map((query) => query.data)
      .filter((detail): detail is AdminPermissionGroupDetail => Boolean(detail))
  }, [permissionGroupDetailQueries])

  const permissionGroupDetailsReady =
    permissionGroups.length === 0 ||
    permissionGroupDetailQueries.every((query) => query.isSuccess)

  useEffect(() => {
    if (!roleDetailQuery.data || !permissionGroupDetailsReady) {
      return
    }

    const derived = derivePermissionSelection({
      rolePermissionIds: roleDetailQuery.data.permissions.map((item) => item.permissionId),
      groupDetails: permissionGroupDetails,
    })

    setSelectedPermissionGroupIds(derived.selectedPermissionGroupIds)
    setExtraPermissionIds(derived.extraPermissionIds)
    setInitialSelectionSignature(
      JSON.stringify({
        groups: derived.selectedPermissionGroupIds,
        extras: derived.extraPermissionIds,
      })
    )
  }, [roleDetailQuery.data, permissionGroupDetails, permissionGroupDetailsReady])

  const updatePermissionsMutation = useMutation({
    mutationFn: (variables: {
      roleId: string
      permissionGroupIds: string[]
      permissionIds: string[]
    }) =>
      updateRolePermissions(variables.roleId, {
        permissionGroupIds: variables.permissionGroupIds,
        permissionIds: variables.permissionIds,
        changeReason: null,
      }),
    onSuccess: async (result) => {
      if (currentUser?.roles.includes(result.roleKey)) {
        toast.success('当前账号所拥有的角色权限已变化，请重新登录刷新权限。')
        resetAuth()
        window.location.assign('/sign-in')
        return
      }

      toast.success('角色权限已保存')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'roles'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'role', result.roleId],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapSystemErrorMessage(error, '保存角色权限失败，请稍后重试。'))
    },
  })

  const selectedRoleSummary = useMemo<AdminRoleListItem | null>(() => {
    return roles.find((item) => item.roleId === selectedRoleId) ?? null
  }, [roles, selectedRoleId])

  const selectedRoleDetail = roleDetailQuery.data
  const currentSelectionSignature = JSON.stringify({
    groups: [...selectedPermissionGroupIds].sort(),
    extras: [...extraPermissionIds].sort(),
  })
  const permissionSelectionDirty =
    initialSelectionSignature.length > 0 &&
    currentSelectionSignature !== initialSelectionSignature

  const explicitExtraPermissions = useMemo(() => {
    if (!selectedRoleDetail) {
      return []
    }

    const extraSet = new Set(extraPermissionIds)
    return selectedRoleDetail.permissions.filter((item) =>
      extraSet.has(item.permissionId)
    )
  }, [extraPermissionIds, selectedRoleDetail])

  const handleTogglePermissionGroup = (permissionGroupId: string, checked: boolean) => {
    setSelectedPermissionGroupIds((current) => {
      if (checked) {
        return [...new Set([...current, permissionGroupId])].sort()
      }

      return current.filter((item) => item !== permissionGroupId)
    })
  }

  const handleSavePermissions = () => {
    if (!selectedRoleId) return

    updatePermissionsMutation.mutate({
      roleId: selectedRoleId,
      permissionGroupIds: selectedPermissionGroupIds,
      permissionIds: extraPermissionIds,
    })
  }

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>角色权限</h1>
          <p className='text-sm text-muted-foreground'>
            查看 RBAC 角色、权限版本和权限组覆盖范围，并保存角色授权。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='搜索角色编码、角色名称'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,1fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>角色列表</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {rolesQuery.data?.total ?? 0} 个角色。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void rolesQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {rolesQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : rolesQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>角色列表加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(rolesQuery.error, '角色列表加载失败，请稍后重试。')}
                </AlertDescription>
              </Alert>
            ) : roles.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配角色</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的角色，可以尝试清空搜索后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色</TableHead>
                    <TableHead>权限范围</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((row) => (
                    <TableRow
                      key={row.roleId}
                      className={cn(
                        'cursor-pointer',
                        row.roleId === selectedRoleId && 'bg-muted/50'
                      )}
                      onClick={() => setSelectedRoleId(row.roleId)}
                    >
                      <TableCell>
                        <div className='space-y-1'>
                          <div className='font-medium'>{row.roleName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {row.roleKey}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        权限点 {row.permissionCount} 项 · 已分配 {row.assignedUserCount} 人
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          <Badge variant={row.status === 'ENABLED' ? 'default' : 'outline'}>
                            {formatRoleStatus(row.status)}
                          </Badge>
                          {row.isBuiltin ? <Badge variant='secondary'>内置</Badge> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限配置</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedRoleSummary ? (
              <Alert>
                <AlertTitle>请选择角色</AlertTitle>
                <AlertDescription>
                  从左侧选择一个角色后，可在这里查看详情并调整权限组授权。
                </AlertDescription>
              </Alert>
            ) : roleDetailQuery.isLoading || !permissionGroupDetailsReady ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-28 w-full' />
                <Skeleton className='h-36 w-full' />
              </div>
            ) : roleDetailQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>角色详情加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    roleDetailQuery.error,
                    '角色详情加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : permissionGroupDetailQueries.some((query) => query.isError) ? (
              <Alert variant='destructive'>
                <AlertTitle>权限组详情加载失败</AlertTitle>
                <AlertDescription>
                  权限组详情尚未完全加载成功，暂时无法编辑角色授权，请刷新后重试。
                </AlertDescription>
              </Alert>
            ) : selectedRoleDetail ? (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <ShieldIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>{selectedRoleDetail.roleName}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedRoleDetail.roleKey}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <Badge
                        variant={
                          selectedRoleDetail.status === 'ENABLED' ? 'default' : 'outline'
                        }
                      >
                        {formatRoleStatus(selectedRoleDetail.status)}
                      </Badge>
                      {selectedRoleDetail.isBuiltin ? (
                        <Badge variant='secondary'>内置</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>权限版本：{selectedRoleDetail.permissionVersion}</p>
                    <p>当前权限点：{selectedRoleDetail.permissions.length} 项</p>
                    <p>当前分配用户：{selectedRoleDetail.assignedUsers.length} 人</p>
                  </div>
                </div>

                {explicitExtraPermissions.length > 0 ? (
                  <Alert>
                    <KeyRoundIcon className='size-4' />
                    <AlertTitle>检测到额外动作权限</AlertTitle>
                    <AlertDescription>
                      当前角色存在 {explicitExtraPermissions.length}{' '}
                      个未被已选权限组覆盖的 action 权限。本次保存会继续保留这些权限。
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>权限组</h2>
                      <p className='text-xs text-muted-foreground'>
                        角色页按权限组勾选，保存时由服务端展开为最终 action 权限集。
                      </p>
                    </div>
                    <Badge variant='outline'>
                      {selectedPermissionGroupIds.length} 项已选
                    </Badge>
                  </div>

                  {permissionGroupsQuery.isLoading ? (
                    <div className='space-y-2'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
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
                  ) : (
                    <div className='space-y-2'>
                      {permissionGroups.map((group) => {
                        const checked = selectedPermissionGroupIds.includes(
                          group.permissionGroupId
                        )
                        const disabled =
                          group.status !== 'ENABLED' || !canAssignPermissions

                        return (
                          <label
                            key={group.permissionGroupId}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                              checked && 'border-primary/50 bg-primary/5',
                              disabled && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) =>
                                handleTogglePermissionGroup(
                                  group.permissionGroupId,
                                  Boolean(value)
                                )
                              }
                            />
                            <div className='min-w-0 flex-1 space-y-1'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <span className='font-medium'>{group.groupName}</span>
                                <Badge variant='secondary'>{group.groupKey}</Badge>
                                {group.isBuiltin ? <Badge variant='outline'>内置</Badge> : null}
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {group.description || '未填写权限组说明。'}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                类型 {group.groupType} · 权限点 {group.permissionCount} 项 ·
                                菜单绑定 {group.menuCount} 项 · 状态 {group.status}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {explicitExtraPermissions.length > 0 ? (
                  <div className='space-y-2 rounded-lg border border-dashed p-4'>
                    <h3 className='text-sm font-medium'>保留中的额外动作权限</h3>
                    <div className='flex flex-wrap gap-2'>
                      {explicitExtraPermissions.map((permission) => (
                        <Badge key={permission.permissionId} variant='outline'>
                          {permission.permissionKey}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <AdminPermissionGuard
                  allOfPermissions={[ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS]}
                  fallback={
                    <AdminReadOnlyNotice description='当前账号仅具备角色查看权限，权限分配动作已隐藏。' />
                  }
                >
                  <div className='flex items-center justify-end gap-2 border-t pt-4'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={
                        !permissionSelectionDirty ||
                        updatePermissionsMutation.isPending
                      }
                      onClick={() => {
                        if (!selectedRoleDetail || !permissionGroupDetailsReady) return
                        const derived = derivePermissionSelection({
                          rolePermissionIds: selectedRoleDetail.permissions.map(
                            (item) => item.permissionId
                          ),
                          groupDetails: permissionGroupDetails,
                        })
                        setSelectedPermissionGroupIds(
                          derived.selectedPermissionGroupIds
                        )
                        setExtraPermissionIds(derived.extraPermissionIds)
                      }}
                    >
                      还原
                    </Button>
                    <Button
                      type='button'
                      disabled={
                        !permissionSelectionDirty ||
                        updatePermissionsMutation.isPending
                      }
                      onClick={handleSavePermissions}
                    >
                      保存角色权限
                    </Button>
                  </div>
                </AdminPermissionGuard>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
