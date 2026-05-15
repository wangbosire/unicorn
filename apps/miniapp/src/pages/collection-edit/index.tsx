import { useCallback, useState } from 'react'
import { Button, Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import type { GetCollectionContentResponseData } from '@contracts/member/my-collections/get-collection-content.response'
import type { SaveCollectionDraftRequest } from '@contracts/member/my-collections/save-collection-draft.request'
import type { SaveCollectionDraftResponseData } from '@contracts/member/my-collections/save-collection-draft.response'
import type { SubmitCollectionContentRequest } from '@contracts/member/my-collections/submit-collection-content.request'
import type { SubmitCollectionContentResponseData } from '@contracts/member/my-collections/submit-collection-content.response'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { buildContentPayload, readTextFromPayload } from '../../lib/collection-content-draft'
import { formatMemberContentReviewStatus } from '../../lib/member-content-review-status'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

function formatEditNavTitle(displayTitle: string): string {
  const s = displayTitle.trim()
  if (!s) return '编辑藏品'
  return s.length > 16 ? `${s.slice(0, 16)}…` : s
}

/**
 * M2：单件藏品内容编辑与提交审核（最小闭环）。
 * 依赖路由参数 `collectionId`；可选 `collectionNo` 用于跳转公开展示页。
 */
export default function CollectionEditPage() {
  const [collectionId, setCollectionId] = useState('')
  const [collectionNo, setCollectionNo] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [versionId, setVersionId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)
  /** 当前版本在 GET 内容接口中返回的最新审核记录状态（用于刷新后仍展示「待人工复核」等）。 */
  const [contentReviewStatus, setContentReviewStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadContent = useCallback(async (id: string) => {
    if (!id) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await requestMemberApi<GetCollectionContentResponseData>({
        path: `/member-api/my/collections/${id}/content`,
        method: 'GET',
      })
      const v = data.currentVersion
      setVersionId(v.id)
      setEditStatus(v.editStatus)
      setPublishStatus(v.publishStatus)
      setContentReviewStatus(
        typeof v.contentReviewStatus === 'string' ? v.contentReviewStatus : null,
      )
      const payload = v.contentPayload as Record<string, unknown> | undefined
      const nextTitle =
        readTextFromPayload(payload, 'title') || (typeof v.title === 'string' ? v.title : '')
      const nextSummary =
        readTextFromPayload(payload, 'summary') || (typeof v.summary === 'string' ? v.summary : '')
      const nextCover =
        readTextFromPayload(payload, 'coverImageUrl') ||
        (typeof v.coverImageUrl === 'string' ? v.coverImageUrl : '')
      setTitle(nextTitle)
      setSummary(nextSummary)
      setCoverUrl(nextCover)
      void Taro.setNavigationBarTitle({ title: formatEditNavTitle(nextTitle) })
    } catch (error) {
      const message =
        error instanceof MemberApiError ? formatMemberApiErrorMessage(error) : '加载失败'
      setErrorMessage(message)
      void Taro.setNavigationBarTitle({ title: '编辑藏品内容' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useLoad((options) => {
    const id =
      typeof options.collectionId === 'string' ? decodeParam(options.collectionId) : ''
    const no =
      typeof options.collectionNo === 'string' ? decodeParam(options.collectionNo) : ''
    setCollectionId(id)
    setCollectionNo(no)
    void loadContent(id)
  })

  usePullDownRefresh(() => {
    const inst = Taro.getCurrentInstance()
    const raw = inst?.router?.params?.collectionId
    const id = typeof raw === 'string' ? decodeParam(raw) : collectionId
    void loadContent(id).finally(() => {
      void Taro.stopPullDownRefresh()
    })
  })

  /** 与后端一致：`UNDER_REVIEW` 不可保存；`APPROVED` 等可走「派生新版本」保存分支。 */
  const canSaveDraft =
    Boolean(collectionId) &&
    editStatus != null &&
    editStatus !== 'UNDER_REVIEW' &&
    !isLoading
  const canSubmit =
    Boolean(collectionId) &&
    Boolean(versionId) &&
    (editStatus === 'DRAFT' || editStatus === 'REJECTED') &&
    !isLoading
  const canOpenPublic = Boolean(collectionNo) && publishStatus === 'PUBLISHED'

  async function handleSaveDraft() {
    if (!collectionId) return
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const payload = buildContentPayload(title, summary, coverUrl)
      const body: SaveCollectionDraftRequest = {
        title: title.trim(),
        summary: summary.trim(),
        coverImageUrl: coverUrl.trim() || null,
        contentPayload: payload,
      }
      const result = await requestMemberApi<SaveCollectionDraftResponseData, SaveCollectionDraftRequest>({
        path: `/member-api/my/collections/${collectionId}/content/drafts`,
        method: 'POST',
        data: body,
      })
      setVersionId(result.versionId)
      setEditStatus(result.editStatus)
      setPublishStatus(result.publishStatus)
      Taro.showToast({ title: '草稿已保存', icon: 'success' })
      await loadContent(collectionId)
    } catch (error) {
      const message =
        error instanceof MemberApiError ? formatMemberApiErrorMessage(error) : '保存失败'
      setErrorMessage(message)
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmitReview() {
    if (!collectionId || !versionId) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await requestMemberApi<
        SubmitCollectionContentResponseData,
        SubmitCollectionContentRequest
      >({
        path: `/member-api/my/collections/${collectionId}/content/submissions`,
        method: 'POST',
        data: { versionId },
      })
      setEditStatus(result.editStatus)
      Taro.showToast({
        title: `已提交：${formatMemberContentReviewStatus(result.reviewStatus)}`,
        icon: 'none',
      })
      await loadContent(collectionId)
    } catch (error) {
      const message =
        error instanceof MemberApiError ? formatMemberApiErrorMessage(error) : '提交失败'
      setErrorMessage(message)
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenPublic() {
    if (!collectionNo) return
    Taro.navigateTo({
      url: `/pages/collection-public/index?slug=${encodeURIComponent(collectionNo)}`,
    })
  }

  return (
    <PageShell
      title="编辑藏品内容"
      description="保存草稿后可提交审核；机审通过后内容将公开发布（若服务端开启人工闸门，则需人工通过后才公开）。下拉可刷新。"
      background="linear-gradient(180deg, #e0f2fe 0%, #f8fafc 40%, #fff7ed 100%)"
      heroBackground="#0c4a6e"
      heroTextColor="#e0f2fe"
      heroDescriptionColor="rgba(224, 242, 254, 0.85)"
    >
      <View style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button
          type="default"
          onClick={() => {
            void Taro.switchTab({ url: '/pages/collections/index' })
          }}
        >
          返回我的藏品
        </Button>

        {errorMessage ? (
          <StatusCard
            title="请求失败"
            description={errorMessage}
            background="#fef2f2"
            borderColor="#fca5a5"
            titleColor="#991b1b"
            descriptionColor="#b91c1c"
          />
        ) : null}

        {editStatus === 'UNDER_REVIEW' ? (
          <Text style={{ fontSize: '12px', color: '#b45309', lineHeight: '18px' }}>
            {contentReviewStatus === 'PENDING_MANUAL'
              ? '机审已通过，正等待运营人工复核；通过前不会公开发布，暂不可编辑。'
              : '当前版本审核中，暂不可保存草稿；请等待机审或人工结果后再操作。'}
          </Text>
        ) : null}
        {editStatus === 'APPROVED' ? (
          <Text style={{ fontSize: '12px', color: '#1d4ed8', lineHeight: '18px' }}>
            当前版本已通过审核；再次保存将基于新版本创建草稿（见后端 `saveCollectionDraft` 派生逻辑）。
          </Text>
        ) : null}
        {editStatus === 'REJECTED' ? (
          <Text style={{ fontSize: '12px', color: '#991b1b', lineHeight: '18px' }}>
            机审或审核未通过，可修改后保存并重新提交。
          </Text>
        ) : null}

        <Text style={{ fontSize: '12px', color: '#64748b' }}>
          藏品 ID：{collectionId || '—'}
        </Text>
        {collectionNo ? (
          <Text style={{ fontSize: '12px', color: '#64748b' }}>藏品编号：{collectionNo}</Text>
        ) : null}
        <Text style={{ fontSize: '12px', color: '#64748b' }}>
          状态：edit={editStatus ?? '—'} / publish={publishStatus ?? '—'} / 审核：
          {formatMemberContentReviewStatus(contentReviewStatus)}
        </Text>

        <View style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Text style={{ fontSize: '14px', fontWeight: 600 }}>标题</Text>
          <Input
            value={title}
            placeholder="请输入展示标题"
            disabled={editStatus === 'UNDER_REVIEW'}
            onInput={(event) => setTitle(event.detail.value)}
          />
        </View>

        <View style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Text style={{ fontSize: '14px', fontWeight: 600 }}>摘要</Text>
          <Textarea
            value={summary}
            placeholder="请输入展示摘要"
            disabled={editStatus === 'UNDER_REVIEW'}
            style={{ minHeight: '96px', width: '100%', boxSizing: 'border-box' }}
            onInput={(event) => setSummary(event.detail.value)}
          />
        </View>

        <View style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Text style={{ fontSize: '14px', fontWeight: 600 }}>封面图 URL（可选）</Text>
          <Input
            value={coverUrl}
            placeholder="https://..."
            disabled={editStatus === 'UNDER_REVIEW'}
            onInput={(event) => setCoverUrl(event.detail.value)}
          />
        </View>

        <Button type="primary" disabled={!canSaveDraft || isSaving} loading={isSaving} onClick={handleSaveDraft}>
          保存草稿
        </Button>
        <Button disabled={!canSubmit || isSubmitting} loading={isSubmitting} onClick={handleSubmitReview}>
          提交审核
        </Button>
        {canOpenPublic ? (
          <Button onClick={handleOpenPublic}>查看公开展示</Button>
        ) : null}

        <Text style={{ fontSize: '12px', color: '#64748b', lineHeight: '18px' }}>
          提示：标题包含「__MACHINE_REJECT__」时，机审将拒绝且不会公开发布（联调用例）。
        </Text>
      </View>
    </PageShell>
  )
}
