import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  GetNotificationTemplateResponseData,
  ListNotificationDispatchRecordsResponseData,
  UpsertNotificationTemplateRequest,
} from '@contracts/admin/notifications'
import {
  BellRing,
  CircleAlert,
  Download,
  Inbox,
  PencilLine,
  Plus,
  Send,
} from 'lucide-react'
import {
  createNotificationTemplate,
  getNotificationDispatchRecord,
  getNotificationDispatchHistory,
  getNotificationTemplate,
  getNotificationsOverview,
  listNotificationFailureSummary,
  listNotificationDispatchRecords,
  listNotificationTemplates,
  retryNotificationDispatch,
  updateNotificationTemplate,
  updateNotificationTemplateStatus,
} from '@/apis/notifications/notifications'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageLayout } from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  NOTIFICATION_FAILURE_CODE_OPTIONS,
  formatNotificationChannels,
  formatNotificationDispatchStatus,
  formatNotificationMessageType,
  formatNotificationTemplateStatus,
  formatNotificationTimestamp,
  mapNotificationDispatchMutationErrorMessage,
  mapNotificationTemplateMutationErrorMessage,
  mapNotificationsOverviewErrorMessage,
  type NotificationFailureCode,
} from '@/lib/notifications-display'
import {
  buildNotificationDispatchRecordsCsv,
  buildNotificationFailureSummaryCsv,
  downloadUtf8Csv,
} from '@/lib/notifications-csv'
import { toast } from 'sonner'

const DISPATCH_MESSAGE_TYPE_OPTIONS = [
  'ACTIVATE_SUCCESS',
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'CONTENT_TAKEDOWN',
  'COMMENT_REVIEW_RESULT',
  'TRANSFER_PENDING_ACCEPT',
  'TRANSFER_COMPLETED',
  'TRANSFER_CANCELLED',
  'TRANSFER_EXPIRED',
  'TRANSFER_ROLLED_BACK',
] as const

type EditableTemplateState = {
  templateKey: string
  displayName: string
  description: string
  changeNote: string
  inAppTitle: string
  inAppContent: string
  miniappTitle: string
  miniappContent: string
  wechatTitle: string
  wechatContent: string
}

function createEmptyEditableTemplate(): EditableTemplateState {
  return {
    templateKey: '',
    displayName: '',
    description: '',
    changeNote: '',
    inAppTitle: '',
    inAppContent: '',
    miniappTitle: '',
    miniappContent: '',
    wechatTitle: '',
    wechatContent: '',
  }
}

function toEditableTemplateState(
  detail: GetNotificationTemplateResponseData
): EditableTemplateState {
  const byChannel = new Map(detail.channels.map((item) => [item.channel, item]))
  return {
    templateKey: detail.templateKey,
    displayName: detail.displayName,
    description: detail.description ?? '',
    changeNote: '',
    inAppTitle: byChannel.get('IN_APP')?.title ?? '',
    inAppContent: byChannel.get('IN_APP')?.content ?? '',
    miniappTitle: byChannel.get('MINIAPP_SUBSCRIPTION')?.title ?? '',
    miniappContent: byChannel.get('MINIAPP_SUBSCRIPTION')?.content ?? '',
    wechatTitle: byChannel.get('WECHAT_MP')?.title ?? '',
    wechatContent: byChannel.get('WECHAT_MP')?.content ?? '',
  }
}

function buildTemplatePayload(
  detail: Pick<GetNotificationTemplateResponseData, 'templateKey'>,
  form: EditableTemplateState
): UpsertNotificationTemplateRequest {
  const channels: UpsertNotificationTemplateRequest['channels'] = []

  if (form.inAppTitle.trim() || form.inAppContent.trim()) {
    channels.push({
      channel: 'IN_APP',
      title: form.inAppTitle.trim(),
      content: form.inAppContent.trim(),
    })
  }

  if (form.miniappTitle.trim() || form.miniappContent.trim()) {
    channels.push({
      channel: 'MINIAPP_SUBSCRIPTION',
      title: form.miniappTitle.trim(),
      content: form.miniappContent.trim(),
    })
  }

  if (form.wechatTitle.trim() || form.wechatContent.trim()) {
    channels.push({
      channel: 'WECHAT_MP',
      title: form.wechatTitle.trim(),
      content: form.wechatContent.trim(),
    })
  }

  return {
    templateKey: detail.templateKey,
    displayName: form.displayName.trim(),
    description: form.description.trim() || null,
    changeNote: form.changeNote.trim() || null,
    channels,
  }
}

async function copyText(text: string, label: string): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已复制`)
      return
    }
  } catch {
    // Fallback below when clipboard API is unavailable or blocked.
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (copied) {
        toast.success(`${label}已复制`)
        return
      }
    }
  } catch {
    // Fall through to final error toast.
  }

  toast.error(`${label}复制失败，请手动复制。`)
}

function formatExportFilenameDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>(
    'ALL'
  )
  const [dispatchMessageTypeFilter, setDispatchMessageTypeFilter] = useState<
    'ALL' | (typeof DISPATCH_MESSAGE_TYPE_OPTIONS)[number]
  >('ALL')
  const [dispatchChannelFilter, setDispatchChannelFilter] = useState<
    'ALL' | 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  >('ALL')
  const [dispatchFailureCodeFilter, setDispatchFailureCodeFilter] = useState<
    'ALL' | NotificationFailureCode
  >('ALL')
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<
    'ALL' | 'PENDING' | 'SENT' | 'FAILED'
  >('FAILED')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editableTemplate, setEditableTemplate] = useState<EditableTemplateState>(
    createEmptyEditableTemplate()
  )
  const [statusConfirm, setStatusConfirm] = useState<{
    templateId: string
    displayName: string
    nextStatus: 'ACTIVE' | 'DISABLED'
  } | null>(null)
  const [retryConfirm, setRetryConfirm] = useState<
    ListNotificationDispatchRecordsResponseData['items'][number] | null
  >(null)
  const [selectedDispatchRecord, setSelectedDispatchRecord] = useState<
    ListNotificationDispatchRecordsResponseData['items'][number] | null
  >(null)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)

  const templateStatusForApi = statusFilter === 'ALL' ? undefined : statusFilter
  const dispatchMessageTypeForApi =
    dispatchMessageTypeFilter === 'ALL' ? undefined : dispatchMessageTypeFilter
  const dispatchChannelForApi =
    dispatchChannelFilter === 'ALL' ? undefined : dispatchChannelFilter
  const dispatchFailureCodeForApi =
    dispatchFailureCodeFilter === 'ALL' ? undefined : dispatchFailureCodeFilter
  const dispatchStatusForApi =
    dispatchStatusFilter === 'ALL' ? undefined : dispatchStatusFilter

  const {
    data: overview,
    error: overviewError,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['admin', 'notifications', 'overview'],
    queryFn: getNotificationsOverview,
  })

  const {
    data: templates,
    error: templatesError,
    isLoading: isTemplatesLoading,
    isError: isTemplatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ['admin', 'notifications', 'templates', templateStatusForApi],
    queryFn: () =>
      listNotificationTemplates({
        page: 1,
        pageSize: 50,
        ...(templateStatusForApi ? { status: templateStatusForApi } : {}),
      }),
  })

  const {
    data: failureSummary,
    error: failureSummaryError,
    isLoading: isFailureSummaryLoading,
    isError: isFailureSummaryError,
    refetch: refetchFailureSummary,
  } = useQuery({
    queryKey: [
      'admin',
      'notifications',
      'failure-summary',
      dispatchMessageTypeForApi,
      dispatchChannelForApi,
      dispatchFailureCodeForApi,
    ],
    queryFn: () =>
      listNotificationFailureSummary({
        page: 1,
        pageSize: 10,
        ...(dispatchMessageTypeForApi ? { messageType: dispatchMessageTypeForApi } : {}),
        ...(dispatchChannelForApi ? { channel: dispatchChannelForApi } : {}),
        ...(dispatchFailureCodeForApi ? { failureCode: dispatchFailureCodeForApi } : {}),
      }),
  })

  const {
    data: dispatchRecords,
    error: dispatchRecordsError,
    isLoading: isDispatchRecordsLoading,
    isError: isDispatchRecordsError,
    refetch: refetchDispatchRecords,
  } = useQuery({
    queryKey: [
      'admin',
      'notifications',
      'dispatch-records',
      dispatchStatusForApi,
      dispatchMessageTypeForApi,
      dispatchChannelForApi,
      dispatchFailureCodeForApi,
    ],
    queryFn: () =>
      listNotificationDispatchRecords({
        page: 1,
        pageSize: 20,
        ...(dispatchMessageTypeForApi ? { messageType: dispatchMessageTypeForApi } : {}),
        ...(dispatchChannelForApi ? { channel: dispatchChannelForApi } : {}),
        ...(dispatchFailureCodeForApi ? { failureCode: dispatchFailureCodeForApi } : {}),
        ...(dispatchStatusForApi ? { status: dispatchStatusForApi } : {}),
      }),
  })

  const templateDetailQuery = useQuery({
    queryKey: ['admin', 'notifications', 'template', editingTemplateId],
    queryFn: () => getNotificationTemplate(editingTemplateId!),
    enabled: editingTemplateId != null,
  })

  const dispatchHistoryQuery = useQuery({
    queryKey: [
      'admin',
      'notifications',
      'dispatch-history',
      selectedDispatchRecord?.dispatchRecordId,
    ],
    queryFn: () => getNotificationDispatchHistory(selectedDispatchRecord!.dispatchRecordId),
    enabled: selectedDispatchRecord != null,
  })

  useEffect(() => {
    if (templateDetailQuery.data) {
      setEditableTemplate(toEditableTemplateState(templateDetailQuery.data))
      setExpandedVersionId(templateDetailQuery.data.versions[0]?.versionId ?? null)
    }
  }, [templateDetailQuery.data])

  const createTemplateMutation = useMutation({
    mutationFn: (payload: UpsertNotificationTemplateRequest) =>
      createNotificationTemplate(payload),
    onSuccess: async () => {
      toast.success('通知模板创建成功')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'templates'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'overview'] }),
      ])
      setIsCreateDialogOpen(false)
      setEditableTemplate(createEmptyEditableTemplate())
    },
    onError: (error: unknown) => {
      toast.error(mapNotificationTemplateMutationErrorMessage(error))
    },
  })

  const updateTemplateMutation = useMutation({
    mutationFn: (variables: {
      templateId: string
      payload: UpsertNotificationTemplateRequest
    }) => updateNotificationTemplate(variables.templateId, variables.payload),
    onSuccess: async () => {
      toast.success('通知模板已更新并发布新版本')
      const currentId = editingTemplateId
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'templates'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'overview'] }),
      ])
      if (currentId) {
        await queryClient.invalidateQueries({
          queryKey: ['admin', 'notifications', 'template', currentId],
        })
      }
      setEditingTemplateId(null)
      setEditableTemplate(createEmptyEditableTemplate())
    },
    onError: (error: unknown) => {
      toast.error(mapNotificationTemplateMutationErrorMessage(error))
    },
  })

  const updateTemplateStatusMutation = useMutation({
    mutationFn: (variables: {
      templateId: string
      status: 'ACTIVE' | 'DISABLED'
    }) =>
      updateNotificationTemplateStatus(variables.templateId, {
        status: variables.status,
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.status === 'ACTIVE' ? '模板已启用' : '模板已停用')
      setStatusConfirm(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'templates'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'overview'] }),
      ])
      if (editingTemplateId === variables.templateId) {
        await queryClient.invalidateQueries({
          queryKey: ['admin', 'notifications', 'template', variables.templateId],
        })
      }
    },
    onError: (error: unknown) => {
      toast.error(mapNotificationTemplateMutationErrorMessage(error))
    },
  })

  const retryDispatchMutation = useMutation({
    mutationFn: (dispatchRecordId: string) => retryNotificationDispatch(dispatchRecordId),
    onSuccess: async (result) => {
      toast.success('失败派发已重新入队')
      setRetryConfirm(null)
      setSelectedDispatchRecord((current) => {
        if (!current || current.dispatchRecordId !== result.dispatchRecordId) {
          return current
        }

        const nextRecord = {
          ...current,
          status: 'PENDING' as const,
          providerResponse: '已重新入队，等待渠道发送。',
          sentAt: null,
        }

        return dispatchStatusFilter === 'FAILED' ? null : nextRecord
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'notifications', 'dispatch-records'],
        }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'overview'] }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(mapNotificationDispatchMutationErrorMessage(error))
    },
  })

  const templateRows = templates?.items ?? []
  const dispatchRows = dispatchRecords?.items ?? []
  const failureSummaryRows = failureSummary?.items ?? []
  const templateDetail = templateDetailQuery.data ?? null
  const isEditing = editingTemplateId != null

  const summaryCards = useMemo(
    () => [
      {
        title: '消息总数',
        value: overview?.totalMessages ?? 0,
        hint: `未读 ${overview?.unreadMessages ?? 0} 条`,
        icon: <Inbox className='h-4 w-4 text-muted-foreground' />,
      },
      {
        title: '待发送',
        value: overview?.pendingDispatches ?? 0,
        hint: '待异步发送或等待渠道确认',
        icon: <BellRing className='h-4 w-4 text-muted-foreground' />,
      },
      {
        title: '发送失败',
        value: overview?.failedDispatches ?? 0,
        hint: '可在下方查看失败原因摘要',
        icon: <CircleAlert className='h-4 w-4 text-muted-foreground' />,
      },
      {
        title: '统计生成',
        value: formatNotificationTimestamp(overview?.generatedAt ?? null),
        hint: '基于当前通知消息与派发记录',
        icon: <Send className='h-4 w-4 text-muted-foreground' />,
      },
    ],
    [overview]
  )

  const handleTemplateDialogChange = (open: boolean) => {
    if (!open) {
      setIsCreateDialogOpen(false)
      setEditingTemplateId(null)
      setExpandedVersionId(null)
      setEditableTemplate(createEmptyEditableTemplate())
    }
  }

  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null)
    setExpandedVersionId(null)
    setEditableTemplate(createEmptyEditableTemplate())
    setIsCreateDialogOpen(true)
  }

  const handleChangeDispatchFailureCodeFilter = (
    value: 'ALL' | NotificationFailureCode
  ) => {
    setDispatchFailureCodeFilter(value)
    if (value !== 'ALL' && dispatchStatusFilter !== 'FAILED') {
      setDispatchStatusFilter('FAILED')
    }
  }

  const handleOpenEditTemplate = (templateId: string) => {
    setIsCreateDialogOpen(false)
    setExpandedVersionId(null)
    setEditableTemplate(createEmptyEditableTemplate())
    setEditingTemplateId(templateId)
  }

  const handleExportFailureSummaryCsv = () => {
    if (isFailureSummaryLoading) {
      toast.error('请等待失败聚合加载完成后再导出')
      return
    }
    if (isFailureSummaryError) {
      toast.error('失败聚合加载失败，请先重试后再导出')
      return
    }
    if (failureSummaryRows.length === 0) {
      toast.error('当前页没有可导出的失败聚合数据')
      return
    }

    const filename = `notification-failure-summary-${formatExportFilenameDate(new Date())}.csv`
    downloadUtf8Csv(filename, buildNotificationFailureSummaryCsv(failureSummaryRows))

    if ((failureSummary?.total ?? 0) > failureSummaryRows.length) {
      toast.success(`已导出当前页 ${failureSummaryRows.length} 条失败聚合`, {
        description: `当前筛选下共 ${failureSummary?.total ?? 0} 条，现阶段仅导出已加载数据。`,
      })
      return
    }

    toast.success(`已导出 ${failureSummaryRows.length} 条失败聚合`)
  }

  const handleExportDispatchRecordsCsv = () => {
    if (isDispatchRecordsLoading) {
      toast.error('请等待派发记录加载完成后再导出')
      return
    }
    if (isDispatchRecordsError) {
      toast.error('派发记录加载失败，请先重试后再导出')
      return
    }
    if (dispatchRows.length === 0) {
      toast.error('当前页没有可导出的派发记录')
      return
    }

    const filename = `notification-dispatch-records-${formatExportFilenameDate(new Date())}.csv`
    downloadUtf8Csv(filename, buildNotificationDispatchRecordsCsv(dispatchRows))

    if ((dispatchRecords?.total ?? 0) > dispatchRows.length) {
      toast.success(`已导出当前页 ${dispatchRows.length} 条派发记录`, {
        description: `当前筛选下共 ${dispatchRecords?.total ?? 0} 条，现阶段仅导出已加载数据。`,
      })
      return
    }

    toast.success(`已导出 ${dispatchRows.length} 条派发记录`)
  }

  const handleSubmitTemplate = () => {
    const templateKey = isEditing ? templateDetail?.templateKey : editableTemplate.templateKey

    if (!templateKey) {
      toast.error('请选择要维护的模板类型。')
      return
    }

    if (isEditing && !templateDetail) {
      toast.error('模板详情尚未加载完成，请稍后重试。')
      return
    }

    const payload = buildTemplatePayload(
      {
        templateKey,
      },
      editableTemplate
    )

    if (!payload.displayName || payload.channels.length === 0) {
      toast.error('请至少填写展示名，并保留一条完整的渠道文案。')
      return
    }

    const hasInvalidChannel = payload.channels.some(
      (item) => !item.title.trim() || !item.content.trim()
    )
    if (hasInvalidChannel) {
      toast.error('已填写的渠道文案必须同时包含标题和正文。')
      return
    }

    if (isEditing) {
      updateTemplateMutation.mutate({
        templateId: templateDetail!.templateId,
        payload,
      })
      return
    }

    createTemplateMutation.mutate(payload)
  }

  const combinedError =
    overviewError ?? templatesError ?? failureSummaryError ?? dispatchRecordsError

  const handleOpenDispatchRecordById = async (dispatchRecordId: string) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['admin', 'notifications', 'dispatch-record', dispatchRecordId],
        queryFn: () => getNotificationDispatchRecord(dispatchRecordId),
      })
      setSelectedDispatchRecord(detail)
    } catch (error) {
      toast.error(mapNotificationDispatchMutationErrorMessage(error))
    }
  }

  const handlePrepareRetryDispatchRecordById = async (dispatchRecordId: string) => {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['admin', 'notifications', 'dispatch-record', dispatchRecordId],
        queryFn: () => getNotificationDispatchRecord(dispatchRecordId),
      })
      setRetryConfirm(detail)
    } catch (error) {
      toast.error(mapNotificationDispatchMutationErrorMessage(error))
    }
  }

  return (
    <>
      <PageLayout>
        <div className='mb-6 space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>通知中心</h1>
          <p className='text-sm text-muted-foreground'>
            管理站内信、微信通知模板和关键事件的发送通道。
          </p>
        </div>

        {isOverviewLoading ||
        isTemplatesLoading ||
        isFailureSummaryLoading ||
        isDispatchRecordsLoading ? (
          <div className='py-8 text-center text-muted-foreground'>
            正在加载通知中心…
          </div>
        ) : isOverviewError ||
          isTemplatesError ||
          isFailureSummaryError ||
          isDispatchRecordsError ? (
          <div className='flex flex-col items-center gap-3 py-8'>
            <p className='max-w-md text-center text-destructive'>
              {mapNotificationsOverviewErrorMessage(combinedError)}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                void refetchOverview()
                void refetchTemplates()
                void refetchFailureSummary()
                void refetchDispatchRecords()
              }}
            >
              重试
            </Button>
          </div>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {summaryCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
                    {card.icon}
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{card.value}</div>
                    <p className='text-xs text-muted-foreground'>{card.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className='mt-4'>
              <CardHeader>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div>
                    <CardTitle>通知模板</CardTitle>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      当前支持新建、编辑和启停模板；每次保存都会生成新版本。
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) =>
                        setStatusFilter(value as 'ALL' | 'ACTIVE' | 'DISABLED')
                      }
                    >
                      <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder='选择模板状态' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部模板</SelectItem>
                        <SelectItem value='ACTIVE'>仅看启用</SelectItem>
                        <SelectItem value='DISABLED'>仅看停用</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type='button' size='sm' onClick={handleOpenCreateTemplate}>
                      <Plus className='mr-1 h-4 w-4' />
                      新建模板
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模板</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>当前版本</TableHead>
                      <TableHead>触达渠道</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateRows.length > 0 ? (
                      templateRows.map((row) => (
                        <TableRow key={row.templateId}>
                          <TableCell className='font-medium'>
                            <div className='flex flex-col gap-1'>
                              <span>{row.displayName}</span>
                              <span className='text-xs text-muted-foreground'>
                                {row.templateKey}
                              </span>
                              {row.description ? (
                                <span className='max-w-[360px] truncate text-xs text-muted-foreground'>
                                  {row.description}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {formatNotificationTemplateStatus(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>v{row.currentVersion ?? '—'}</TableCell>
                          <TableCell>{formatNotificationChannels(row.channels)}</TableCell>
                          <TableCell>{formatNotificationTimestamp(row.updatedAt)}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-2'>
                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                onClick={() => handleOpenEditTemplate(row.templateId)}
                              >
                                <PencilLine className='mr-1 h-4 w-4' />
                                编辑
                              </Button>
                              <Button
                                type='button'
                                size='sm'
                                variant={row.status === 'ACTIVE' ? 'outline' : 'default'}
                                onClick={() =>
                                  setStatusConfirm({
                                    templateId: row.templateId,
                                    displayName: row.displayName,
                                    nextStatus: row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                                  })
                                }
                              >
                                {row.status === 'ACTIVE' ? '停用' : '启用'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
                          当前筛选条件下暂无通知模板，可以先创建首个模板。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className='mt-4'>
              <CardHeader>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div>
                    <CardTitle>失败聚合</CardTitle>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      按事件模板、渠道和失败原因汇总，便于优先处理集中故障。
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Select
                      value={dispatchFailureCodeFilter}
                      onValueChange={(value) =>
                        handleChangeDispatchFailureCodeFilter(
                          value as 'ALL' | NotificationFailureCode
                        )
                      }
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='选择失败标签' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部失败标签</SelectItem>
                        {NOTIFICATION_FAILURE_CODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={isFailureSummaryLoading || isFailureSummaryError}
                      onClick={handleExportFailureSummaryCsv}
                    >
                      <Download className='mr-1 h-4 w-4' />
                      导出当前页 CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件 / 渠道</TableHead>
                      <TableHead>失败原因</TableHead>
                      <TableHead>失败次数</TableHead>
                      <TableHead>影响消息</TableHead>
                      <TableHead>最近失败</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureSummaryRows.length > 0 ? (
                      failureSummaryRows.map((row) => (
                        <TableRow key={row.latestDispatchRecordId}>
                          <TableCell className='font-medium'>
                            <div className='flex flex-col gap-1'>
                              <span>{row.eventLabel}</span>
                              <span className='text-xs text-muted-foreground'>
                                {row.messageType} / {formatNotificationChannels([row.channel])}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='max-w-[320px]'>
                            <div className='flex flex-col gap-1'>
                              <span className='text-sm text-foreground'>
                                {row.failureReason}
                              </span>
                              <span
                                className='block truncate text-xs text-muted-foreground'
                                title={row.sampleReason ?? '暂无原始样例'}
                              >
                                {row.sampleReason ?? '暂无原始样例'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{row.failedCount}</TableCell>
                          <TableCell>{row.affectedMessages}</TableCell>
                          <TableCell>
                            {formatNotificationTimestamp(row.latestFailedAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-2'>
                              <Button
                                type='button'
                                size='sm'
                                variant='ghost'
                                onClick={() =>
                                  void handleOpenDispatchRecordById(
                                    row.latestDispatchRecordId
                                  )
                                }
                              >
                                查看最近失败
                              </Button>
                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                disabled={retryDispatchMutation.isPending}
                                onClick={() =>
                                  void handlePrepareRetryDispatchRecordById(
                                    row.latestDispatchRecordId
                                  )
                                }
                              >
                                重投最近失败
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
                          当前筛选条件下暂无失败聚合数据。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className='mt-4'>
              <CardHeader>
                <CardTitle>通知摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件类型</TableHead>
                      <TableHead>触达渠道</TableHead>
                      <TableHead>最近消息</TableHead>
                      <TableHead>最近状态</TableHead>
                      <TableHead>待发送 / 失败</TableHead>
                      <TableHead>最近成功发送</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.items ?? []).map((row) => (
                      <TableRow key={row.messageType}>
                        <TableCell className='font-medium'>
                          <div className='flex flex-col gap-1'>
                            <span>{row.eventLabel}</span>
                            <span className='text-xs text-muted-foreground'>
                              {row.messageType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatNotificationChannels(row.channels)}</TableCell>
                        <TableCell className='max-w-[320px]'>
                          <div className='flex flex-col gap-1'>
                            <span className='font-medium'>{row.latestTitle}</span>
                            <span
                              className='truncate text-xs text-muted-foreground'
                              title={row.latestContent}
                            >
                              {row.latestContent}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.latestDispatchStatus === 'FAILED'
                                ? 'destructive'
                                : row.latestDispatchStatus === 'PENDING'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {formatNotificationDispatchStatus(row.latestDispatchStatus)}
                          </Badge>
                          {row.latestDispatchNote ? (
                            <p
                              className='mt-1 max-w-[220px] truncate text-xs text-muted-foreground'
                              title={row.latestDispatchNote}
                            >
                              {row.latestDispatchNote}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.pendingDispatches} / {row.failedDispatches}
                        </TableCell>
                        <TableCell>{formatNotificationTimestamp(row.lastSentAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className='mt-4'>
              <CardHeader>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div>
                    <CardTitle>派发记录</CardTitle>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      展示最近的通知派发结果；失败记录支持直接重投。
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Select
                      value={dispatchMessageTypeFilter}
                      onValueChange={(value) =>
                        setDispatchMessageTypeFilter(
                          value as 'ALL' | (typeof DISPATCH_MESSAGE_TYPE_OPTIONS)[number]
                        )
                      }
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='选择事件类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部事件类型</SelectItem>
                        {DISPATCH_MESSAGE_TYPE_OPTIONS.map((messageType) => (
                          <SelectItem key={messageType} value={messageType}>
                            {formatNotificationMessageType(messageType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={dispatchChannelFilter}
                      onValueChange={(value) =>
                        setDispatchChannelFilter(
                          value as 'ALL' | 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
                        )
                      }
                    >
                      <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder='选择触达渠道' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部渠道</SelectItem>
                        <SelectItem value='IN_APP'>站内信</SelectItem>
                        <SelectItem value='MINIAPP_SUBSCRIPTION'>
                          小程序订阅消息
                        </SelectItem>
                        <SelectItem value='WECHAT_MP'>公众号通知</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={dispatchStatusFilter}
                      onValueChange={(value) =>
                        setDispatchStatusFilter(
                          value as 'ALL' | 'PENDING' | 'SENT' | 'FAILED'
                        )
                      }
                    >
                      <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder='选择派发状态' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部派发状态</SelectItem>
                        <SelectItem value='FAILED'>仅看失败</SelectItem>
                        <SelectItem value='PENDING'>仅看待发送</SelectItem>
                        <SelectItem value='SENT'>仅看成功</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={dispatchFailureCodeFilter}
                      onValueChange={(value) =>
                        handleChangeDispatchFailureCodeFilter(
                          value as 'ALL' | NotificationFailureCode
                        )
                      }
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='选择失败标签' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ALL'>全部失败标签</SelectItem>
                        {NOTIFICATION_FAILURE_CODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={isDispatchRecordsLoading || isDispatchRecordsError}
                      onClick={handleExportDispatchRecordsCsv}
                    >
                      <Download className='mr-1 h-4 w-4' />
                      导出当前页 CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>事件 / 渠道</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>失败原因 / 渠道响应</TableHead>
                      <TableHead>发送时间</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchRows.length > 0 ? (
                      dispatchRows.map((row) => (
                        <TableRow key={row.dispatchRecordId}>
                          <TableCell className='font-medium'>
                            <div className='flex flex-col gap-1'>
                              <span>{row.eventLabel}</span>
                              <span className='text-xs text-muted-foreground'>
                                {row.messageType} / {formatNotificationChannels([row.channel])}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='max-w-[320px]'>
                            <div className='flex flex-col gap-1'>
                              <span className='font-medium'>{row.title}</span>
                              <span
                                className='truncate text-xs text-muted-foreground'
                                title={row.content}
                              >
                                {row.content}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.status === 'FAILED'
                                  ? 'destructive'
                                  : row.status === 'PENDING'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {formatNotificationDispatchStatus(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className='max-w-[260px]'>
                            <div className='flex flex-col gap-1'>
                              {row.failureReason ? (
                                <span className='text-sm text-foreground'>
                                  {row.failureReason}
                                </span>
                              ) : null}
                              <span
                                className='block truncate text-xs text-muted-foreground'
                                title={row.providerResponse ?? '—'}
                              >
                                {row.providerResponse ?? '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatNotificationTimestamp(row.sentAt ?? row.createdAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-2'>
                              <Button
                                type='button'
                                size='sm'
                                variant='ghost'
                                onClick={() => setSelectedDispatchRecord(row)}
                              >
                                查看详情
                              </Button>
                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                disabled={
                                  row.status !== 'FAILED' || retryDispatchMutation.isPending
                                }
                                onClick={() => setRetryConfirm(row)}
                              >
                                重投
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
                          当前筛选条件下暂无派发记录，请调整事件类型、渠道或派发状态后重试。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </PageLayout>

      <Dialog
        open={selectedDispatchRecord != null}
        onOpenChange={(open) => !open && setSelectedDispatchRecord(null)}
      >
        <DialogContent className='max-h-[80vh] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>派发记录详情</DialogTitle>
            <DialogDescription>
              查看完整通知文案、渠道响应与基础派发信息，便于快速排查失败原因。
            </DialogDescription>
          </DialogHeader>

          {selectedDispatchRecord ? (
            <div className='grid gap-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>事件类型</span>
                  <span className='text-sm font-medium text-foreground'>
                    {selectedDispatchRecord.eventLabel}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {selectedDispatchRecord.messageType}
                  </span>
                </div>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>派发状态</span>
                  <div>
                    <Badge
                      variant={
                        selectedDispatchRecord.status === 'FAILED'
                          ? 'destructive'
                          : selectedDispatchRecord.status === 'PENDING'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {formatNotificationDispatchStatus(selectedDispatchRecord.status)}
                    </Badge>
                  </div>
                </div>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>触达渠道</span>
                  <span className='text-sm text-foreground'>
                    {formatNotificationChannels([selectedDispatchRecord.channel])}
                  </span>
                </div>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>目标会员</span>
                  <span className='text-sm text-foreground'>
                    {selectedDispatchRecord.memberId}
                  </span>
                </div>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>消息主键</span>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='break-all text-sm text-foreground'>
                      {selectedDispatchRecord.messageId}
                    </span>
                    <Button
                      type='button'
                      size='xs'
                      variant='ghost'
                      onClick={() =>
                        void copyText(selectedDispatchRecord.messageId, '消息主键')
                      }
                    >
                      复制
                    </Button>
                  </div>
                </div>
                <div className='grid gap-1 rounded-lg border p-3'>
                  <span className='text-xs text-muted-foreground'>派发时间</span>
                  <span className='text-sm text-foreground'>
                    {formatNotificationTimestamp(
                      selectedDispatchRecord.sentAt ?? selectedDispatchRecord.createdAt
                    )}
                  </span>
                </div>
                <div className='grid gap-1 rounded-lg border p-3 md:col-span-2'>
                  <span className='text-xs text-muted-foreground'>派发记录主键</span>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='break-all text-sm text-foreground'>
                      {selectedDispatchRecord.dispatchRecordId}
                    </span>
                    <Button
                      type='button'
                      size='xs'
                      variant='ghost'
                      onClick={() =>
                        void copyText(
                          selectedDispatchRecord.dispatchRecordId,
                          '派发记录主键'
                        )
                      }
                    >
                      复制
                    </Button>
                  </div>
                </div>
              </div>

              <div className='grid gap-2 rounded-lg border p-4'>
                <span className='text-xs text-muted-foreground'>通知标题</span>
                <div className='whitespace-pre-wrap text-sm text-foreground'>
                  {selectedDispatchRecord.title}
                </div>
              </div>

              <div className='grid gap-2 rounded-lg border p-4'>
                <span className='text-xs text-muted-foreground'>通知正文</span>
                <div className='whitespace-pre-wrap text-sm text-foreground'>
                  {selectedDispatchRecord.content}
                </div>
              </div>

              <div className='grid gap-2 rounded-lg border p-4'>
                <span className='text-xs text-muted-foreground'>渠道响应 / 失败原因</span>
                {selectedDispatchRecord.failureReason ? (
                  <div className='text-sm font-medium text-foreground'>
                    {selectedDispatchRecord.failureReason}
                  </div>
                ) : null}
                <div className='whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 text-sm text-foreground'>
                  {selectedDispatchRecord.providerResponse ?? '暂无渠道响应信息'}
                </div>
              </div>

              <div className='grid gap-3 rounded-lg border p-4'>
                <div>
                  <span className='text-xs text-muted-foreground'>重试历史</span>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    展示同一消息在当前渠道上的全部派发尝试时间线。
                  </p>
                </div>

                {dispatchHistoryQuery.isLoading ? (
                  <div className='py-4 text-sm text-muted-foreground'>正在加载重试历史…</div>
                ) : dispatchHistoryQuery.isError ? (
                  <div className='py-4 text-sm text-destructive'>
                    {mapNotificationDispatchMutationErrorMessage(dispatchHistoryQuery.error)}
                  </div>
                ) : dispatchHistoryQuery.data ? (
                  <div className='grid gap-3'>
                    <div className='text-xs text-muted-foreground'>
                      共 {dispatchHistoryQuery.data.totalAttempts} 次尝试
                    </div>
                    {dispatchHistoryQuery.data.attempts.map((attempt) => (
                      <div
                        key={attempt.dispatchRecordId}
                        className='rounded-md border bg-muted/20 p-3'
                      >
                        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                          <div className='flex items-center gap-2'>
                            <span className='text-sm font-medium text-foreground'>
                              第 {attempt.attemptNo} 次尝试
                            </span>
                            <Badge
                              variant={
                                attempt.status === 'FAILED'
                                  ? 'destructive'
                                  : attempt.status === 'PENDING'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {formatNotificationDispatchStatus(attempt.status)}
                            </Badge>
                            {attempt.dispatchRecordId ===
                            selectedDispatchRecord.dispatchRecordId ? (
                              <Badge variant='secondary'>当前查看</Badge>
                            ) : null}
                          </div>
                          <span className='text-xs text-muted-foreground'>
                            {formatNotificationTimestamp(attempt.sentAt ?? attempt.createdAt)}
                          </span>
                        </div>
                        <div className='mt-2 text-xs text-muted-foreground'>
                          记录 ID：{attempt.dispatchRecordId}
                        </div>
                        {attempt.failureReason ? (
                          <div className='mt-2 text-sm font-medium text-foreground'>
                            {attempt.failureReason}
                          </div>
                        ) : null}
                        <div className='mt-2 whitespace-pre-wrap break-all text-sm text-foreground'>
                          {attempt.providerResponse ?? '暂无渠道响应信息'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedDispatchRecord.status === 'FAILED' ? (
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={retryDispatchMutation.isPending}
                    onClick={() => setRetryConfirm(selectedDispatchRecord)}
                  >
                    重投这条派发
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setSelectedDispatchRecord(null)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateDialogOpen || editingTemplateId != null}
        onOpenChange={handleTemplateDialogChange}
      >
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑通知模板' : '新建通知模板'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? '调整当前模板的展示名、说明与各渠道文案。保存后会生成新的模板版本。'
                : '创建一个新的通知模板并发布首个版本，后续可继续维护不同渠道文案。'}
            </DialogDescription>
          </DialogHeader>

          {isEditing && (templateDetailQuery.isLoading || templateDetail == null) ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              正在加载模板详情…
            </div>
          ) : isEditing && templateDetailQuery.isError ? (
            <div className='py-8 text-center text-sm text-destructive'>
              {mapNotificationTemplateMutationErrorMessage(templateDetailQuery.error)}
            </div>
          ) : (
            <div className='grid gap-5'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <label className='text-sm font-medium text-foreground'>展示名</label>
                  <Input
                    value={editableTemplate.displayName}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder='例如：激活成功通知'
                  />
                </div>

                <div className='grid gap-2'>
                  <label className='text-sm font-medium text-foreground'>模板键</label>
                  {isEditing ? (
                    <Input value={templateDetail!.templateKey} disabled />
                  ) : (
                    <Select
                      value={editableTemplate.templateKey}
                      onValueChange={(value) =>
                        setEditableTemplate((prev) => ({
                          ...prev,
                          templateKey: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='选择通知事件类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ACTIVATE_SUCCESS'>ACTIVATE_SUCCESS</SelectItem>
                        <SelectItem value='CONTENT_APPROVED'>CONTENT_APPROVED</SelectItem>
                        <SelectItem value='CONTENT_REJECTED'>CONTENT_REJECTED</SelectItem>
                        <SelectItem value='CONTENT_TAKEDOWN'>CONTENT_TAKEDOWN</SelectItem>
                        <SelectItem value='COMMENT_REVIEW_RESULT'>
                          COMMENT_REVIEW_RESULT
                        </SelectItem>
                        <SelectItem value='TRANSFER_PENDING_ACCEPT'>
                          TRANSFER_PENDING_ACCEPT
                        </SelectItem>
                        <SelectItem value='TRANSFER_COMPLETED'>TRANSFER_COMPLETED</SelectItem>
                        <SelectItem value='TRANSFER_CANCELLED'>TRANSFER_CANCELLED</SelectItem>
                        <SelectItem value='TRANSFER_EXPIRED'>TRANSFER_EXPIRED</SelectItem>
                        <SelectItem value='TRANSFER_ROLLED_BACK'>
                          TRANSFER_ROLLED_BACK
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-foreground'>模板说明</label>
                <Textarea
                  value={editableTemplate.description}
                  onChange={(event) =>
                    setEditableTemplate((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder='说明这个模板的业务场景和触达对象'
                  rows={3}
                />
              </div>

              <div className='grid gap-2'>
                <label className='text-sm font-medium text-foreground'>变更说明</label>
                <Input
                  value={editableTemplate.changeNote}
                  onChange={(event) =>
                    setEditableTemplate((prev) => ({
                      ...prev,
                      changeNote: event.target.value,
                    }))
                  }
                  placeholder='例如：补充节日活动文案'
                />
              </div>

              <div className='rounded-lg border p-4'>
                <div className='mb-3'>
                  <h3 className='text-sm font-semibold text-foreground'>站内信文案</h3>
                  <p className='text-xs text-muted-foreground'>
                    当前必须至少保留一条完整的渠道文案，建议优先维护站内信。
                  </p>
                </div>
                <div className='grid gap-3'>
                  <Input
                    value={editableTemplate.inAppTitle}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        inAppTitle: event.target.value,
                      }))
                    }
                    placeholder='站内信标题'
                  />
                  <Textarea
                    value={editableTemplate.inAppContent}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        inAppContent: event.target.value,
                      }))
                    }
                    placeholder='站内信正文，支持 {collectionName} 这类占位变量'
                    rows={4}
                  />
                </div>
              </div>

              <div className='rounded-lg border p-4'>
                <div className='mb-3'>
                  <h3 className='text-sm font-semibold text-foreground'>小程序订阅消息文案</h3>
                  <p className='text-xs text-muted-foreground'>
                    当前链路允许预先维护文案，真实下游触达可后续接入。
                  </p>
                </div>
                <div className='grid gap-3'>
                  <Input
                    value={editableTemplate.miniappTitle}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        miniappTitle: event.target.value,
                      }))
                    }
                    placeholder='小程序消息标题'
                  />
                  <Textarea
                    value={editableTemplate.miniappContent}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        miniappContent: event.target.value,
                      }))
                    }
                    placeholder='小程序消息正文'
                    rows={4}
                  />
                </div>
              </div>

              <div className='rounded-lg border p-4'>
                <div className='mb-3'>
                  <h3 className='text-sm font-semibold text-foreground'>公众号通知文案</h3>
                  <p className='text-xs text-muted-foreground'>
                    可单独维护公众号触达标题与正文，便于后续渠道差异化展示。
                  </p>
                </div>
                <div className='grid gap-3'>
                  <Input
                    value={editableTemplate.wechatTitle}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        wechatTitle: event.target.value,
                      }))
                    }
                    placeholder='公众号通知标题'
                  />
                  <Textarea
                    value={editableTemplate.wechatContent}
                    onChange={(event) =>
                      setEditableTemplate((prev) => ({
                        ...prev,
                        wechatContent: event.target.value,
                      }))
                    }
                    placeholder='公众号通知正文'
                    rows={4}
                  />
                </div>
              </div>

              {isEditing ? (
                <div className='grid gap-4 lg:grid-cols-[1fr_280px]'>
                  <div className='rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground'>
                    当前版本：v{templateDetail!.currentVersion ?? '—'}，历史版本数：
                    {templateDetail!.versions.length}。
                  </div>
                  <div className='rounded-lg border p-4'>
                    <div className='mb-3'>
                      <h3 className='text-sm font-semibold text-foreground'>版本历史</h3>
                      <p className='text-xs text-muted-foreground'>
                        按版本倒序展示，便于运营回看最近几次文案调整。
                      </p>
                    </div>
                    <div className='flex max-h-56 flex-col gap-3 overflow-y-auto'>
                      {templateDetail!.versions.map((version) => (
                        <div
                          key={version.versionId}
                          className='rounded-md border border-border/70 bg-background p-3'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span className='text-sm font-medium text-foreground'>
                              v{version.version}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {formatNotificationTimestamp(version.createdAt)}
                            </span>
                          </div>
                          <p className='mt-2 text-xs text-muted-foreground'>
                            {version.changeNote || '未填写变更说明'}
                          </p>
                          <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            className='mt-2 h-7 px-2 text-xs'
                            onClick={() =>
                              setExpandedVersionId((current) =>
                                current === version.versionId ? null : version.versionId
                              )
                            }
                          >
                            {expandedVersionId === version.versionId
                              ? '收起版本文案'
                              : '查看版本文案'}
                          </Button>
                          {expandedVersionId === version.versionId ? (
                            <div className='mt-3 flex flex-col gap-2'>
                              {version.channels.map((channel) => (
                                <div
                                  key={`${version.versionId}-${channel.channel}`}
                                  className='rounded-md border border-dashed border-border/70 p-2'
                                >
                                  <div className='text-xs font-medium text-foreground'>
                                    {formatNotificationChannels([channel.channel])}
                                  </div>
                                  <div className='mt-1 text-xs text-foreground'>
                                    标题：{channel.title}
                                  </div>
                                  <div className='mt-1 whitespace-pre-wrap text-xs text-muted-foreground'>
                                    正文：{channel.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => handleTemplateDialogChange(false)}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitTemplate}
              disabled={
                createTemplateMutation.isPending ||
                updateTemplateMutation.isPending ||
                (isEditing &&
                  (templateDetailQuery.isLoading || templateDetailQuery.isError))
              }
            >
              {createTemplateMutation.isPending || updateTemplateMutation.isPending
                ? '保存中...'
                : isEditing
                  ? '保存并发布新版本'
                  : '创建并发布首个版本'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={retryConfirm != null}
        onOpenChange={(open) => !open && setRetryConfirm(null)}
        title='确认重投失败派发'
        desc={
          retryConfirm ? (
            <span>
              将重新投递「{retryConfirm.title}」到
              {formatNotificationChannels([retryConfirm.channel])}。重投后这条记录会从
              “仅看失败”列表中移除。
            </span>
          ) : (
            ''
          )
        }
        confirmText='确认重投'
        isLoading={retryDispatchMutation.isPending}
        handleConfirm={() => {
          if (!retryConfirm) return
          retryDispatchMutation.mutate(retryConfirm.dispatchRecordId)
        }}
      />

      <ConfirmDialog
        open={statusConfirm != null}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        title={statusConfirm?.nextStatus === 'ACTIVE' ? '启用通知模板' : '停用通知模板'}
        desc={
          statusConfirm ? (
            <span>
              确认要
              {statusConfirm.nextStatus === 'ACTIVE' ? '启用' : '停用'}模板
              「{statusConfirm.displayName}」吗？
            </span>
          ) : (
            ''
          )
        }
        confirmText={statusConfirm?.nextStatus === 'ACTIVE' ? '确认启用' : '确认停用'}
        destructive={statusConfirm?.nextStatus === 'DISABLED'}
        isLoading={updateTemplateStatusMutation.isPending}
        handleConfirm={() => {
          if (!statusConfirm) return
          updateTemplateStatusMutation.mutate({
            templateId: statusConfirm.templateId,
            status: statusConfirm.nextStatus,
          })
        }}
      />
    </>
  )
}
