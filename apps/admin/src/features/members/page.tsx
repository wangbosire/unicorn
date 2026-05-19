import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type PaginationState } from '@tanstack/react-table'
import type { AdminMemberListItem } from '@contracts/admin/members'
import { UsersIcon, WalletCardsIcon } from 'lucide-react'
import { listMembers, updateMemberStatus } from '@/apis/members/members'
import { AdminReadOnlyNotice } from '@/components/admin/admin-readonly-notice'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAdminPermission } from '@/hooks/use-admin-permission'
import { PageLayout } from '@/components/layout/page-layout'
import {
  ProCard,
  ProCardGroup,
  ProPageContainer,
  ProQueryFilter,
  ProQueryFilterItem,
  ProStatCard,
} from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api-error'
import { ADMIN_PERMISSION_MEMBERS_MANAGE } from '@/lib/admin-route-access'
import { toast } from 'sonner'
import { MembersTable } from './components/members-table'

const SEARCH_DEBOUNCE_MS = 400

/**
 * 将输入防抖后用于接口查询，避免筛选输入频繁触发服务端请求。
 */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function mapListMembersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_MEMBER_STATUS':
        return '会员状态筛选无效，请改用工具栏中的状态筛选。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「会员列表」权限，请联系管理员开通。'
      default:
        return error.message || '会员列表加载失败，请稍后重试。'
    }
  }
  return '会员列表加载失败，请检查网络后重试。'
}

function mapUpdateMemberStatusErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'MEMBER_NOT_FOUND':
      return '未找到该会员，可能已被删除或列表已过期，请刷新后重试。'
    case 'INVALID_MEMBER_STATUS':
      return '会员状态参数无效，请重试。'
    case 'VALIDATION_ERROR':
      return '请求参数校验失败，请刷新页面后重试。'
    case 'ADMIN_AUTH_TOKEN_MISSING':
    case 'ADMIN_AUTH_TOKEN_INVALID':
      return '登录已失效或未携带后台令牌，请重新登录后再试。'
    case 'ADMIN_AUTH_FORBIDDEN':
      return '当前账号无「会员状态管理」权限，请联系管理员开通。'
    default:
      return error.message || '更新会员状态失败，请稍后重试。'
  }
}

export function MembersPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAdminPermission()
  const canManageMembers = hasPermission(ADMIN_PERMISSION_MEMBERS_MANAGE)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FROZEN'>(
    'ALL'
  )
  const [statusConfirm, setStatusConfirm] = useState<{
    member: AdminMemberListItem
    nextStatus: 'ACTIVE' | 'FROZEN'
  } | null>(null)

  const statusForApi = statusFilter === 'ALL' ? undefined : statusFilter

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(1)
    }, 0)
    return () => window.clearTimeout(id)
  }, [debouncedSearch, statusForApi])

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      ...(statusForApi ? { status: statusForApi } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [page, pageSize, statusForApi, debouncedSearch]
  )

  const { data, error, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'members', queryParams],
    queryFn: () => listMembers(queryParams),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (variables: { memberId: string; status: 'ACTIVE' | 'FROZEN' }) =>
      updateMemberStatus(variables.memberId, { status: variables.status }),
    onSuccess: async (_, variables) => {
      const label = variables.status === 'FROZEN' ? '已冻结该会员' : '已解冻该会员'
      toast.success(label)
      setStatusConfirm(null)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        toast.error(mapUpdateMemberStatusErrorMessage(err))
        return
      }
      toast.error('更新会员状态失败，请检查网络后重试。')
    },
  })

  const items: AdminMemberListItem[] = data?.items ?? []
  const total = data?.total ?? 0
  const activeCount = items.filter((item) => item.status === 'ACTIVE').length
  const frozenCount = items.filter((item) => item.status === 'FROZEN').length
  const ownedCollectionsCount = items.reduce(
    (sum, item) => sum + item.ownedCollectionsCount,
    0
  )

  const handlePaginationModelChange = useCallback(
    (model: PaginationState) => {
      setPageSize(model.pageSize)
      setPage(model.pageIndex + 1)
    },
    []
  )

  const handleRequestFreeze = useCallback((row: AdminMemberListItem) => {
    setStatusConfirm({ member: row, nextStatus: 'FROZEN' })
  }, [])

  const handleRequestUnfreeze = useCallback((row: AdminMemberListItem) => {
    setStatusConfirm({ member: row, nextStatus: 'ACTIVE' })
  }, [])

  const handleConfirmStatusChange = () => {
    if (!statusConfirm) return
    updateStatusMutation.mutate({
      memberId: statusConfirm.member.memberId,
      status: statusConfirm.nextStatus,
    })
  }

  return (
    <>
      <PageLayout>
        <ProPageContainer
          title='会员管理'
          subtitle='查看会员档案、账号状态与持有藏品概览，并执行冻结 / 解冻操作。'
          description={
            <>
              数据为服务端分页，搜索关键词在输入停止约 {SEARCH_DEBOUNCE_MS / 1000}{' '}
              秒后触发查询。接口：
              <code className='mx-1 text-xs'>GET /admin-api/members</code>
              ，冻结 / 解冻：
              <code className='mx-1 text-xs'>
                PATCH /admin-api/members/:id/status
              </code>
              （需
              <code className='mx-1 text-xs'>members.manage</code>）。
            </>
          }
        >
          <ProCardGroup columns={3}>
            <ProStatCard
              title='会员总量'
              value={total}
              description='当前筛选条件下接口返回的会员总条数。'
              icon={<UsersIcon className='size-5' />}
              footerNote='统计口径：当前查询 total'
            />
            <ProStatCard
              title='当前页正常'
              value={activeCount}
              description='当前页处于正常状态的会员数量。'
              icon={<UsersIcon className='size-5' />}
              trend='up'
              trendLabel='当前页状态概览'
            />
            <ProStatCard
              title='当前页藏品数'
              value={ownedCollectionsCount}
              description='当前页会员合计持有的藏品数量。'
              icon={<WalletCardsIcon className='size-5' />}
              trend='flat'
              trendLabel={`${frozenCount} 位冻结会员`}
            />
          </ProCardGroup>

          <ProQueryFilter
            title='会员筛选'
            description='按会员编号、昵称和账号状态筛选后台会员列表。搜索输入会在停止输入后自动发起查询。'
            defaultCollapsed={false}
            defaultVisibleCount={4}
            submitter={false}
            actions={
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSearchInput('')
                  setStatusFilter('ALL')
                }}
              >
                重置筛选
              </Button>
            }
          >
            <ProQueryFilterItem
              label='关键字'
              description='支持按会员编号或昵称模糊搜索。'
              span={2}
            >
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder='输入会员编号或昵称'
              />
            </ProQueryFilterItem>
            <ProQueryFilterItem
              label='状态'
              description='按会员当前账号状态筛选。'
            >
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'ALL' | 'ACTIVE' | 'FROZEN')
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='选择状态' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>全部状态</SelectItem>
                  <SelectItem value='ACTIVE'>正常</SelectItem>
                  <SelectItem value='FROZEN'>冻结</SelectItem>
                </SelectContent>
              </Select>
            </ProQueryFilterItem>
          </ProQueryFilter>

          {isLoading ? (
            <ProCard>
              <div className='py-8 text-center text-muted-foreground'>
                正在加载会员列表…
              </div>
            </ProCard>
          ) : isError ? (
            <ProCard>
              <div className='flex flex-col items-center gap-3 py-8'>
                <p className='max-w-md text-center text-destructive text-sm'>
                  {mapListMembersErrorMessage(error)}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void refetch()}
                >
                  重试
                </Button>
              </div>
            </ProCard>
          ) : (
            <>
              {!canManageMembers ? (
                <AdminReadOnlyNotice description='当前账号仅具备会员查看权限，冻结与解冻动作已隐藏。' />
              ) : null}
              <MembersTable
                data={items}
                total={total}
                page={page}
                pageSize={pageSize}
                onPaginationModelChange={handlePaginationModelChange}
                actionsDisabled={updateStatusMutation.isPending}
                canManageStatus={canManageMembers}
                onRequestFreeze={handleRequestFreeze}
                onRequestUnfreeze={handleRequestUnfreeze}
              />
            </>
          )}
        </ProPageContainer>
      </PageLayout>

      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => {
          if (!open) setStatusConfirm(null)
        }}
        title={
          statusConfirm?.nextStatus === 'FROZEN' ? '确认冻结会员' : '确认解冻会员'
        }
        desc={
          statusConfirm
            ? statusConfirm.nextStatus === 'FROZEN'
              ? `确定将「${statusConfirm.member.nickname}」（${statusConfirm.member.memberNo}）设为冻结吗？冻结后该会员将无法正常使用账号相关能力。`
              : `确定将「${statusConfirm.member.nickname}」（${statusConfirm.member.memberNo}）恢复为正常状态吗？`
            : ''
        }
        cancelBtnText='取消'
        confirmText={statusConfirm?.nextStatus === 'FROZEN' ? '确认冻结' : '确认解冻'}
        destructive={statusConfirm?.nextStatus === 'FROZEN'}
        isLoading={updateStatusMutation.isPending}
        disabled={!statusConfirm}
        handleConfirm={handleConfirmStatusChange}
      />
    </>
  )
}
