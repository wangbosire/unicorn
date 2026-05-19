import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminMenuListItem,
  AdminPermissionGroupListItem,
} from '@contracts/admin/system'
import {
  FolderTreeIcon,
  RouteIcon,
  SearchIcon,
  ShieldIcon,
} from 'lucide-react'
import {
  getMenu,
  listMenus,
  listPermissionGroups,
  updateMenuPermissionGroups,
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
import { ADMIN_PERMISSION_MENUS_UPDATE } from '@/lib/admin-route-access'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const LIST_PAGE_SIZE = 200
const GROUP_PAGE_SIZE = 200

type MenuTreeRow = AdminMenuListItem & {
  depth: number
}

function mapSystemErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
      case 'ADMIN_AUTH_TOKEN_STALE':
        return '登录状态已失效，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号没有菜单权限管理权限，请联系管理员开通。'
      case 'ADMIN_ACCOUNT_DISABLED':
        return '当前后台账号已被停用，请重新登录确认状态。'
      case 'PERMISSION_GROUP_DISABLED':
        return '所选权限组中存在已停用项，请取消后重试。'
      default:
        return error.message || fallback
    }
  }

  return fallback
}

function formatMenuStatus(status: string): string {
  return status === 'ENABLED' ? '启用' : '停用'
}

function formatMenuType(menuType: string): string {
  switch (menuType) {
    case 'DIRECTORY':
      return '目录'
    case 'PAGE':
      return '页面'
    case 'EXTERNAL_LINK':
      return '外链'
    default:
      return menuType
  }
}

function buildMenuTreeRows(items: AdminMenuListItem[]): MenuTreeRow[] {
  const itemsById = new Map(items.map((item) => [item.menuId, item]))
  const childrenMap = new Map<string | null, AdminMenuListItem[]>()
  const sortedItems = [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }
    return left.createdAt - right.createdAt
  })

  for (const item of sortedItems) {
    const key = item.parentId ?? null
    const current = childrenMap.get(key) ?? []
    current.push(item)
    childrenMap.set(key, current)
  }

  const rootItems = sortedItems.filter((item) => {
    if (!item.parentId) {
      return true
    }
    return !itemsById.has(item.parentId)
  })

  const rows: MenuTreeRow[] = []
  const visited = new Set<string>()

  const walk = (node: AdminMenuListItem, depth: number) => {
    if (visited.has(node.menuId)) {
      return
    }
    visited.add(node.menuId)
    rows.push({ ...node, depth })

    for (const child of childrenMap.get(node.menuId) ?? []) {
      walk(child, depth + 1)
    }
  }

  for (const root of rootItems) {
    walk(root, 0)
  }

  return rows
}

function buildPermissionGroupIdSignature(permissionGroupIds: string[]): string {
  return [...permissionGroupIds].sort().join('|')
}

export function MenusPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAdminPermission()
  const canUpdateMenus = hasPermission(ADMIN_PERMISSION_MENUS_UPDATE)
  const [searchInput, setSearchInput] = useState('')
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [selectedPermissionGroupIds, setSelectedPermissionGroupIds] = useState<
    string[]
  >([])

  const menusQuery = useQuery({
    queryKey: ['admin', 'system', 'menus', searchInput],
    queryFn: () =>
      listMenus({
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

  const menuRows = useMemo(
    () => buildMenuTreeRows(menusQuery.data?.items ?? []),
    [menusQuery.data?.items]
  )
  const permissionGroups = permissionGroupsQuery.data?.items ?? []

  useEffect(() => {
    if (menuRows.length === 0) {
      setSelectedMenuId(null)
      return
    }

    if (!selectedMenuId || !menuRows.some((row) => row.menuId === selectedMenuId)) {
      setSelectedMenuId(menuRows[0]?.menuId ?? null)
    }
  }, [menuRows, selectedMenuId])

  const menuDetailQuery = useQuery({
    queryKey: ['admin', 'system', 'menu', selectedMenuId],
    queryFn: () => getMenu(selectedMenuId ?? ''),
    enabled: !!selectedMenuId,
  })

  useEffect(() => {
    if (!menuDetailQuery.data) {
      return
    }

    setSelectedPermissionGroupIds(
      menuDetailQuery.data.permissionGroups
        .map((group) => group.permissionGroupId)
        .sort()
    )
  }, [menuDetailQuery.data])

  const updateMenuPermissionGroupsMutation = useMutation({
    mutationFn: (variables: {
      menuId: string
      permissionGroupIds: string[]
    }) =>
      updateMenuPermissionGroups(variables.menuId, {
        permissionGroupIds: variables.permissionGroupIds,
        changeReason: null,
      }),
    onSuccess: async (result) => {
      toast.success('菜单权限组绑定已保存')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'menus'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'menu', result.menuId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'system', 'permission-groups'],
        }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(
        mapSystemErrorMessage(error, '保存菜单权限组绑定失败，请稍后重试。')
      )
    },
  })

  const selectedMenuSummary = useMemo<AdminMenuListItem | null>(() => {
    return menuRows.find((item) => item.menuId === selectedMenuId) ?? null
  }, [menuRows, selectedMenuId])

  const selectedMenuDetail = menuDetailQuery.data
  const selectedPermissionGroupSignature = buildPermissionGroupIdSignature(
    selectedPermissionGroupIds
  )
  const initialPermissionGroupSignature = buildPermissionGroupIdSignature(
    selectedMenuDetail?.permissionGroups.map((group) => group.permissionGroupId) ?? []
  )
  const permissionGroupSelectionDirty =
    selectedMenuDetail !== undefined &&
    selectedPermissionGroupSignature !== initialPermissionGroupSignature

  const boundDisabledGroupIds = new Set(
    selectedMenuDetail?.permissionGroups
      .filter((group) => group.status !== 'ENABLED')
      .map((group) => group.permissionGroupId) ?? []
  )

  const handleTogglePermissionGroup = (
    permissionGroupId: string,
    checked: boolean
  ) => {
    setSelectedPermissionGroupIds((current) => {
      if (checked) {
        return [...new Set([...current, permissionGroupId])].sort()
      }

      return current.filter((item) => item !== permissionGroupId)
    })
  }

  const handleSavePermissionGroups = () => {
    if (!selectedMenuId) return

    updateMenuPermissionGroupsMutation.mutate({
      menuId: selectedMenuId,
      permissionGroupIds: selectedPermissionGroupIds,
    })
  }

  return (
    <PageLayout>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>菜单权限</h1>
          <p className='text-sm text-muted-foreground'>
            查看菜单树、权限组绑定和继承关系，并保存菜单的 anyOf 可见性配置。
          </p>
        </div>
        <div className='flex w-full max-w-sm items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <Input
            placeholder='搜索菜单 key、名称、路由'
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>菜单树</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                当前返回 {menusQuery.data?.total ?? 0} 个菜单节点。
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void menusQuery.refetch()}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {menusQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : menusQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>菜单列表加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    menusQuery.error,
                    '菜单列表加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : menuRows.length === 0 ? (
              <Alert>
                <AlertTitle>暂无匹配菜单</AlertTitle>
                <AlertDescription>
                  当前筛选条件下没有命中的菜单，可以尝试清空搜索后重试。
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>菜单</TableHead>
                    <TableHead>路由</TableHead>
                    <TableHead>绑定</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuRows.map((row) => (
                    <TableRow
                      key={row.menuId}
                      className={cn(
                        'cursor-pointer',
                        row.menuId === selectedMenuId && 'bg-muted/50'
                      )}
                      onClick={() => setSelectedMenuId(row.menuId)}
                    >
                      <TableCell>
                        <div
                          className='space-y-1'
                          style={{ paddingLeft: `${row.depth * 16}px` }}
                        >
                          <div className='flex items-center gap-2'>
                            {row.depth > 0 ? (
                              <FolderTreeIcon className='size-4 text-muted-foreground' />
                            ) : null}
                            <span className='font-medium'>{row.menuName}</span>
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {row.menuKey}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {row.routePath || '目录节点'}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        权限组 {row.permissionGroupCount} 项 · 子菜单 {row.childCount} 项
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          <Badge variant={row.status === 'ENABLED' ? 'default' : 'outline'}>
                            {formatMenuStatus(row.status)}
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
            <CardTitle>菜单绑定</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedMenuSummary ? (
              <Alert>
                <AlertTitle>请选择菜单</AlertTitle>
                <AlertDescription>
                  从左侧选择一个菜单节点后，可在这里查看详情并调整权限组绑定。
                </AlertDescription>
              </Alert>
            ) : menuDetailQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-28 w-full' />
                <Skeleton className='h-36 w-full' />
              </div>
            ) : menuDetailQuery.isError ? (
              <Alert variant='destructive'>
                <AlertTitle>菜单详情加载失败</AlertTitle>
                <AlertDescription>
                  {mapSystemErrorMessage(
                    menuDetailQuery.error,
                    '菜单详情加载失败，请稍后重试。'
                  )}
                </AlertDescription>
              </Alert>
            ) : selectedMenuDetail ? (
              <>
                <div className='rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <RouteIcon className='size-4 text-muted-foreground' />
                        <span className='font-medium'>{selectedMenuDetail.menuName}</span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {selectedMenuDetail.menuKey}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <Badge
                        variant={
                          selectedMenuDetail.status === 'ENABLED'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {formatMenuStatus(selectedMenuDetail.status)}
                      </Badge>
                      {selectedMenuDetail.isBuiltin ? (
                        <Badge variant='secondary'>内置</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                    <p>菜单类型：{formatMenuType(selectedMenuDetail.menuType)}</p>
                    <p>父级菜单：{selectedMenuDetail.parentName || '根节点'}</p>
                    <p>路由地址：{selectedMenuDetail.routePath || '目录节点 / 无路由'}</p>
                    <p>直接子菜单：{selectedMenuDetail.children.length} 项</p>
                  </div>
                </div>

                {boundDisabledGroupIds.size > 0 ? (
                  <Alert>
                    <ShieldIcon className='size-4' />
                    <AlertTitle>检测到失效权限组绑定</AlertTitle>
                    <AlertDescription>
                      当前菜单绑定了已停用权限组。运行时应隐藏该菜单；本次可取消勾选后重新保存。
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selectedMenuDetail.children.length > 0 ? (
                  <div className='space-y-2 rounded-lg border border-dashed p-4'>
                    <h3 className='text-sm font-medium'>直接子菜单</h3>
                    <div className='flex flex-wrap gap-2'>
                      {selectedMenuDetail.children.map((child) => (
                        <Button
                          key={child.menuId}
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => setSelectedMenuId(child.menuId)}
                        >
                          {child.menuName}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className='space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <h2 className='text-sm font-medium'>权限组绑定</h2>
                      <p className='text-xs text-muted-foreground'>
                        菜单按 anyOf 生效，只要当前账号命中任一绑定权限组中的 action 即可显示。
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
                      {permissionGroups.map((group: AdminPermissionGroupListItem) => {
                        const checked = selectedPermissionGroupIds.includes(
                          group.permissionGroupId
                        )
                        const disabled =
                          !canUpdateMenus ||
                          (group.status !== 'ENABLED' && !checked)

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
                                {boundDisabledGroupIds.has(group.permissionGroupId) ? (
                                  <Badge variant='destructive'>失效绑定</Badge>
                                ) : null}
                              </div>
                              <p className='text-xs text-muted-foreground'>
                                {group.description || '未填写权限组说明。'}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                类型 {group.groupType} · 权限点 {group.permissionCount} 项 ·
                                当前被 {group.menuCount} 个菜单使用 · 状态 {group.status}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <AdminPermissionGuard
                  allOfPermissions={[ADMIN_PERMISSION_MENUS_UPDATE]}
                  fallback={
                    <AdminReadOnlyNotice description='当前账号仅具备菜单查看权限，绑定保存动作已隐藏。' />
                  }
                >
                  <div className='flex items-center justify-end gap-2 border-t pt-4'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={
                        !permissionGroupSelectionDirty ||
                        updateMenuPermissionGroupsMutation.isPending
                      }
                      onClick={() => {
                        if (!selectedMenuDetail) return
                        setSelectedPermissionGroupIds(
                          selectedMenuDetail.permissionGroups
                            .map((group) => group.permissionGroupId)
                            .sort()
                        )
                      }}
                    >
                      还原
                    </Button>
                    <Button
                      type='button'
                      disabled={
                        !permissionGroupSelectionDirty ||
                        updateMenuPermissionGroupsMutation.isPending
                      }
                      onClick={handleSavePermissionGroups}
                    >
                      保存菜单绑定
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
