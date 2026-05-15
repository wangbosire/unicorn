import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnFiltersState } from '@tanstack/react-table'
import type { AdminMemberListItem } from '@contracts/admin/members'
import { listMembers, updateMemberStatus } from '@/apis/members/members'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { toast } from 'sonner'
import { MembersTable } from './components/members-table'

const SEARCH_DEBOUNCE_MS = 400

/**
 * 将输入防抖后用于接口查询，避免与 data-table 搜索框同步时频繁请求。
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

function statusFromColumnFilters(
  columnFilters: ColumnFiltersState
): 'ACTIVE' | 'FROZEN' | undefined {
  const raw = columnFilters.find((c) => c.id === 'status')?.value as
    | string[]
    | undefined
  if (!raw?.length || raw.length > 1) {
    return undefined
  }
  const v = raw[0]
  if (v === 'ACTIVE' || v === 'FROZEN') return v
  return undefined
}

export function MembersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [statusConfirm, setStatusConfirm] = useState<{
    member: AdminMemberListItem
    nextStatus: 'ACTIVE' | 'FROZEN'
  } | null>(null)

  const statusForApi = useMemo(
    () => statusFromColumnFilters(columnFilters),
    [columnFilters]
  )

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

  const handlePaginationModelChange = useCallback(
    (model: { pageIndex: number; pageSize: number }) => {
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
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>会员管理</h1>
          <p className='text-sm text-muted-foreground'>
            会员列表与发行区一致使用 data-table
            工具条（搜索、状态筛选、列显隐）与底部分页；数据为服务端分页，搜索关键词在输入停止约{' '}
            {SEARCH_DEBOUNCE_MS / 1000} 秒后触发查询。接口：{' '}
            <code className='text-xs'>GET /admin-api/members</code>，冻结 / 解冻：{' '}
            <code className='text-xs'>PATCH /admin-api/members/:id/status</code>（需{' '}
            <code className='text-xs'>members.manage</code>）。
          </p>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载会员列表…
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive text-sm'>
              {mapListMembersErrorMessage(error)}
            </p>
            <Button type='button' variant='outline' size='sm' onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <MembersTable
            data={items}
            total={total}
            page={page}
            pageSize={pageSize}
            onPaginationModelChange={handlePaginationModelChange}
            globalFilter={searchInput}
            onGlobalFilterChange={setSearchInput}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            actionsDisabled={updateStatusMutation.isPending}
            onRequestFreeze={handleRequestFreeze}
            onRequestUnfreeze={handleRequestUnfreeze}
            listIntro={[
              {
                title: '会员总览',
                description: (
                  <>
                    当前共 {total} 位会员。状态多选时若同时包含「正常」与「冻结」，列表等价于不筛选状态。
                  </>
                ),
              },
              { title: '会员列表' },
            ]}
          />
        )}
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
