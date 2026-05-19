import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminRoleListItem, AdminUserListItem } from '@contracts/admin/system'
import { SearchIcon, UserCogIcon } from 'lucide-react'
import {
  getAdminUser,
  listAdminUsers,
  listRoles,
  updateAdminUserRoles,
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
import { ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES } from '@/lib/admin-route-access'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

const LIST_PAGE_SIZE = 100

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有系统管理权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatUserStatus(status: string): string {
  return status === 'ACTIVE' ? '启用' : '停用'
}

function formatRoleStatus(status: string): string {
  return status === 'ENABLED' ? '启用' : '停用'
}

function formatDateTime(value: number | null): string {
  if (!value) {
    return '未登录'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

function buildRoleIdSignature(roleIds: string[]): string {
  return [...roleIds].sort().join('|')
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const resetAuth = useAuthStore((state) => state.auth.reset)
  const { hasPermission } = useAdminPermission()
  const canAssignRoles = hasPermission(ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES)
  const [searchInput, setSearchInput] = useState('')
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  const adminUsersQuery = useQuery({
    queryKey: ['admin', 'system', 'admin-users', searchInput],
    queryFn: () =>
      listAdminUsers({
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
      }),
  })

  const rolesQuery = useQuery({
    queryKey: ['admin', 'system', 'roles', 'all'],
    queryFn: () =>
      listRoles({
        page: 1,
        pageSize: LIST_PAGE_SIZE,
      }),
  })

  const adminUsers = adminUsersQuery.data?.items ?? []
  const roles = rolesQuery.data?.items ?? []

  useEffect(() => {
    if (adminUsers.length === 0) {
      setSelectedAdminUserId(null)
      return
    }

    if (!selectedAdminUserId || !adminUsers.some((item) => item.adminUserId === selectedAdminUserId)) {
      setSelectedAdminUserId(adminUsers[0]?.adminUserId ?? null)
    }
  }, [adminUsers, selectedAdminUserId])

  const adminUserDetailQuery = useQuery({
    queryKey: ['admin', 'system', 'admin-user', selectedAdminUserId],
    queryFn: () => getAdminUser(selectedAdminUserId ?? ''),
    enabled: !!selectedAdminUserId,
  })

  useEffect(() => {
    if (!adminUserDetailQuery.data) {
      return
    }

    setSelectedRoleIds(
      adminUserDetailQuery.data.roles.map((item) => item.roleId).sort()
    )
  }, [adminUserDetailQuery.data])

  const updateRolesMutation = useMutation({
    mutationFn: (variables: { adminUserId: string; roleIds: string[] }) =>
      updateAdminUserRoles(variables.adminUserId, {
        roleIds: variables.roleIds,
        changeReason: null,
      }),
    onSuccess: async (result, variables) => {
      if (currentUser?.id === variables.adminUserId) {
        toast.success('已更新当前账号角色，请重新登录以刷新权限。')
        resetAuth()
        window.location.assign('/sign-in')
        return
      }

      toast.success('后台用户角色已保存')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'admin-users'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'admin-user', result.adminUserId],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapSystemErrorMessage(error, '保存后台用户角色失败，请稍后重试。'))
    },
  })

  const selectedUserSummary = useMemo<AdminUserListItem | null>(() => {
    return adminUsers.find((item) => item.adminUserId === selectedAdminUserId) ?? null
  }, [adminUsers, selectedAdminUserId])

  const selectedUserDetail = adminUserDetailQuery.data
  const roleSelectionDirty =
    selectedUserDetail !== undefined &&
    buildRoleIdSignature(selectedRoleIds) !==
      buildRoleIdSignature(selectedUserDetail.roles.map((item) => item.roleId))

  const handleToggleRole = (roleId: string, checked: boolean) => {
    setSelectedRoleIds((current) => {
      if (checked) {
        return [...new Set([...current, roleId])].sort()
      }

      return current.filter((item) => item !== roleId)
    })
  }

  const handleSaveRoles = () => {
    if (!selectedAdminUserId) return

    updateRolesMutation.mutate({
      adminUserId: selectedAdminUserId,
      roleIds: selectedRoleIds,
    })
  }

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>后台用户</h1>
          <p className='text-sm text-muted-foreground'>
            查看后台账号、角色归属与会话权限版本，并为指定账号分配角色。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='搜索账号编号、用户名、展示名'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>后台账号列表</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {adminUsersQuery.data?.total ?? 0} 个账号。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void adminUsersQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {adminUsersQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : adminUsersQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>后台账号列表加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    adminUsersQuery.error,
                    '后台账号列表加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : adminUsers.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配账号</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的后台用户，可以尝试清空搜索后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>账号</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最近登录</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((row) => (
                    <TableRow
                      key={row.adminUserId}
                      className={cn(
                        'cursor-pointer',
                        row.adminUserId === selectedAdminUserId && 'bg-muted/50'
                      )}
                      onClick={() => setSelectedAdminUserId(row.adminUserId)}
                    >
                      <TableCell>
                        <div className='space-y-1'>
                          <div className='font-medium'>{row.displayName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {row.accountNo} · {row.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {row.roleKeys.length > 0 ? (
                            row.roleKeys.map((roleKey) => (
                              <Badge key={roleKey} variant='secondary'>
                                {roleKey}
                              </Badge>
                            ))
                          ) : (
                            <span className='text-xs text-muted-foreground'>未分配角色</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {formatUserStatus(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {formatDateTime(row.lastLoginAt)}
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
            <CardTitle>角色分配</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedUserSummary ? (
              <Alert>
                <AlertTitle>请选择后台用户</AlertTitle>
                <AlertDescription>
                  从左侧选择一个后台账号后，可在这里查看详情并调整角色归属。
                </AlertDescription>
              </Alert>
            ) : adminUserDetailQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-28 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : adminUserDetailQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>后台用户详情加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    adminUserDetailQuery.error,
                    '后台用户详情加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : selectedUserDetail ? (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <UserCogIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>{selectedUserDetail.displayName}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedUserDetail.accountNo} · {selectedUserDetail.username}
                      </p>
                    </div>
                    <Badge
                      variant={
                        selectedUserDetail.status === 'ACTIVE' ? 'default' : 'outline'
                      }
                    >
                      {formatUserStatus(selectedUserDetail.status)}
                    </Badge>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>当前鉴权版本：{selectedUserDetail.authzVersion}</p>
                    <p>最近登录：{formatDateTime(selectedUserDetail.lastLoginAt)}</p>
                    <p>运行时权限数：{selectedUserDetail.permissionKeys.length}</p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>可分配角色</h2>
                      <p className='text-xs text-muted-foreground'>
                        停用角色不会出现在保存结果中。
                      </p>
                    </div>
                    <Badge variant='outline'>{selectedRoleIds.length} 项已选</Badge>
                  </div>

                  {rolesQuery.isLoading ? (
                    <div className='space-y-2'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  ) : rolesQuery.isError ? (
                    <Alert variant='destructive'>
                      <AlertTitle>角色列表加载失败</AlertTitle>
                      <AlertDescription>
                        {mapSystemErrorMessage(
                          rolesQuery.error,
                          '角色列表加载失败，请稍后重试。'
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className='space-y-2'>
                      {roles.map((role: AdminRoleListItem) => {
                        const checked = selectedRoleIds.includes(role.roleId)
                        const disabled = role.status !== 'ENABLED' || !canAssignRoles

                        return (
                          <label
                            key={role.roleId}
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
                                handleToggleRole(role.roleId, Boolean(value))
                              }
                            />
                            <div className='min-w-0 flex-1 space-y-1'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <span className='font-medium'>{role.roleName}</span>
                                <Badge variant='secondary'>{role.roleKey}</Badge>
                                {role.isBuiltin ? <Badge variant='outline'>内置</Badge> : null}
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {role.description || '未填写角色说明。'}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                权限点 {role.permissionCount} 项 · 已分配 {role.assignedUserCount}{' '}
                                人 · 状态 {formatRoleStatus(role.status)}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <AdminPermissionGuard
                  allOfPermissions={[ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES]}
                  fallback={
                    <AdminReadOnlyNotice description='当前账号仅具备后台用户查看权限，角色分配动作已隐藏。' />
                  }
                >
                  <div className='flex items-center justify-end gap-2 border-t pt-4'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={!roleSelectionDirty || updateRolesMutation.isPending}
                      onClick={() =>
                        setSelectedRoleIds(
                          selectedUserDetail.roles.map((item) => item.roleId).sort()
                        )
                      }
                    >
                      还原
                    </Button>
                    <Button
                      type='button'
                      disabled={!roleSelectionDirty || updateRolesMutation.isPending}
                      onClick={handleSaveRoles}
                    >
                      保存角色分配
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
