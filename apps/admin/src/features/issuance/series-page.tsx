import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateSeriesRequest,
  SeriesListItem,
  UpdateSeriesRequest,
} from '@contracts/admin/series'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createSeries, listSeries, updateSeries, updateSeriesStatus } from '@/apis/issuance/series'
import { ApiError } from '@/lib/api-error'
import { CreateSeriesDialog } from './components/create-series-dialog'
import { EditSeriesDialog } from './components/edit-series-dialog'
import { SeriesTable } from './components/series-table'

export function SeriesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const [editSeriesName, setEditSeriesName] = useState('')
  const [editSeriesDescription, setEditSeriesDescription] = useState('')
  const [seriesName, setSeriesName] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'series'],
    queryFn: () =>
      listSeries({
        page: 1,
        pageSize: 20,
      }),
  })
  const createSeriesMutation = useMutation({
    mutationFn: (payload: CreateSeriesRequest) => createSeries(payload),
    onSuccess: async (createdSeries) => {
      toast.success(`系列 ${createdSeries.name} 创建成功`)
      setIsCreateDialogOpen(false)
      setSeriesName('')
      setSeriesDescription('')
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'series'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapCreateSeriesErrorMessage(error))
        return
      }

      toast.error('系列创建失败，请稍后重试')
    },
  })
  const updateSeriesMutation = useMutation({
    mutationFn: (variables: { seriesId: string; payload: UpdateSeriesRequest }) =>
      updateSeries(variables.seriesId, variables.payload),
    onSuccess: async () => {
      toast.success('系列信息已更新')
      setIsEditDialogOpen(false)
      setEditingSeriesId(null)
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'series'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'series', 'enabled-options'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapUpdateSeriesErrorMessage(error))
        return
      }

      toast.error('系列更新失败，请稍后重试')
    },
  })
  const updateSeriesStatusMutation = useMutation({
    mutationFn: (variables: {
      seriesId: string
      status: 'ENABLED' | 'DISABLED'
    }) => updateSeriesStatus(variables.seriesId, { status: variables.status }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === 'ENABLED' ? '系列已启用' : '系列已停用'
      )
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'series'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'issuance-batches'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'series', 'enabled-options'],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(mapUpdateSeriesStatusErrorMessage(error))
        return
      }

      toast.error('系列状态更新失败，请稍后重试')
    },
  })

  const isSeriesListMutating = useMemo(
    () =>
      createSeriesMutation.isPending ||
      updateSeriesMutation.isPending ||
      updateSeriesStatusMutation.isPending,
    [
      createSeriesMutation.isPending,
      updateSeriesMutation.isPending,
      updateSeriesStatusMutation.isPending,
    ]
  )

  const handleEditSeries = useCallback((row: SeriesListItem) => {
    setEditingSeriesId(row.id)
    setEditSeriesName(row.name)
    setEditSeriesDescription(row.description)
    setIsEditDialogOpen(true)
  }, [])

  const { mutate: mutateSeriesStatus } = updateSeriesStatusMutation

  const handleSetSeriesStatus = useCallback(
    (row: SeriesListItem, status: 'ENABLED' | 'DISABLED') => {
      mutateSeriesStatus({ seriesId: row.id, status })
    },
    [mutateSeriesStatus]
  )

  function handleOpenEditDialog(open: boolean) {
    setIsEditDialogOpen(open)
    if (!open) {
      setEditingSeriesId(null)
    }
  }

  function handleSaveEditedSeries() {
    if (!editingSeriesId) {
      toast.error('未选择要编辑的系列')
      return
    }

    const name = editSeriesName.trim()
    const description = editSeriesDescription.trim()

    if (!name || !description) {
      toast.error('请完整填写系列名称和系列描述')
      return
    }

    updateSeriesMutation.mutate({
      seriesId: editingSeriesId,
      payload: { name, description },
    })
  }

  function handleCreateSeries() {
    const payload = {
      name: seriesName.trim(),
      description: seriesDescription.trim(),
    } satisfies CreateSeriesRequest

    if (!payload.name || !payload.description) {
      toast.error('请完整填写系列名称和系列描述')
      return
    }

    createSeriesMutation.mutate(payload)
  }

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
          <Button onClick={() => setIsCreateDialogOpen(true)}>新增系列</Button>
        </div>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>系列总览</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              当前共 {data?.total ?? 0} 个系列。列表筛选、排序和字段显隐统一走
              data-table 组件。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系列列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='py-8 text-center text-muted-foreground'>
                正在加载系列数据...
              </div>
            ) : isError ? (
              <div className='py-8 text-center text-destructive'>
                系列数据加载失败，请稍后重试。
              </div>
            ) : (
              <SeriesTable
                data={data?.items ?? []}
                actionsDisabled={isSeriesListMutating}
                onEditSeries={handleEditSeries}
                onSetSeriesStatus={handleSetSeriesStatus}
              />
            )}
          </CardContent>
        </Card>
      </Main>

      <CreateSeriesDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        seriesName={seriesName}
        onSeriesNameChange={setSeriesName}
        seriesDescription={seriesDescription}
        onSeriesDescriptionChange={setSeriesDescription}
        onSubmit={handleCreateSeries}
        mutation={createSeriesMutation}
      />

      <EditSeriesDialog
        open={isEditDialogOpen}
        onOpenChange={handleOpenEditDialog}
        seriesName={editSeriesName}
        onSeriesNameChange={setEditSeriesName}
        seriesDescription={editSeriesDescription}
        onSeriesDescriptionChange={setEditSeriesDescription}
        onSubmit={handleSaveEditedSeries}
        mutation={updateSeriesMutation}
      />
    </>
  )
}

/**
 * 将创建系列错误转换为更适合后台操作的提示。
 */
function mapCreateSeriesErrorMessage(error: ApiError): string {
  if (error.code === 'SERIES_NAME_DUPLICATED') {
    return '系列名称已存在，请更换后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '系列信息校验失败，请检查输入内容'
  }

  return error.message || '系列创建失败，请稍后重试'
}

function mapUpdateSeriesErrorMessage(error: ApiError): string {
  if (error.code === 'SERIES_NOT_FOUND') {
    return '系列不存在，请刷新后重试'
  }

  if (error.code === 'SERIES_NAME_DUPLICATED') {
    return '系列名称已存在，请更换后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '系列信息校验失败，请检查输入内容'
  }

  return error.message || '系列更新失败，请稍后重试'
}

function mapUpdateSeriesStatusErrorMessage(error: ApiError): string {
  if (error.code === 'SERIES_NOT_FOUND') {
    return '系列不存在，请刷新后重试'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return '状态参数不合法，请刷新后重试'
  }

  return error.message || '系列状态更新失败，请稍后重试'
}
