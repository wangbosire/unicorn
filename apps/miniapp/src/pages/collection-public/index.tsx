import { useCallback, useMemo, useState } from 'react'
import { Button, Image, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro'
import type { GetPublicCollectionResponseData } from '@contracts/public/collections/get-public-collection.response'
import type { ListPublicCollectionCommentsResponseData } from '@contracts/public/collections/list-public-collection-comments.response'
import type { CreateCollectionCommentRequest } from '@contracts/member/collection-comments/create-collection-comment.request'
import type { CreateCollectionCommentResponseData } from '@contracts/member/collection-comments/create-collection-comment.response'
import type { ReplyCollectionCommentRequest } from '@contracts/member/collection-comments/reply-collection-comment.request'
import type { ReplyCollectionCommentResponseData } from '@contracts/member/collection-comments/reply-collection-comment.response'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { PublicApiError, requestPublicApi } from '../../apis/public/public-api'
import { buildCommentSubmissionMessage, formatCommentPublishedAt } from '../../lib/collection-comments'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import { formatPublicApiErrorMessage } from '../../lib/public-api-errors'
import { extractParagraphTextsFromPayload, filterParagraphsDedupedAgainstTitleSummary } from '../../lib/public-collection-content'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

/**
 * M2：公开展示页（无需登录）。
 * 路由参数 `slug` 一期约定为藏品编号 `collectionNo`。
 */
export default function CollectionPublicPage() {
  const [slug, setSlug] = useState('')
  const [data, setData] = useState<GetPublicCollectionResponseData | null>(null)
  const [commentsData, setCommentsData] =
    useState<ListPublicCollectionCommentsResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commentErrorMessage, setCommentErrorMessage] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null)

  const loadPublic = useCallback(async (s: string) => {
    if (!s) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await requestPublicApi<GetPublicCollectionResponseData>({
        path: `/public-api/collections/${encodeURIComponent(s)}`,
        method: 'GET',
      })
      setData(result)
      if (result.title) {
        void Taro.setNavigationBarTitle({ title: result.title })
      }
    } catch (error) {
      const message =
        error instanceof PublicApiError ? formatPublicApiErrorMessage(error) : '加载失败'
      setErrorMessage(message)
      setData(null)
      void Taro.setNavigationBarTitle({ title: '公开展示' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadComments = useCallback(async (s: string) => {
    if (!s) return
    setIsCommentsLoading(true)
    setCommentErrorMessage(null)
    try {
      const result = await requestPublicApi<ListPublicCollectionCommentsResponseData>({
        path: `/public-api/collections/${encodeURIComponent(s)}/comments`,
        method: 'GET',
      })
      setCommentsData(result)
    } catch (error) {
      const message =
        error instanceof PublicApiError ? formatPublicApiErrorMessage(error) : '评论加载失败'
      setCommentErrorMessage(message)
      setCommentsData(null)
    } finally {
      setIsCommentsLoading(false)
    }
  }, [])

  const reloadAll = useCallback(
    async (s: string) => {
      if (!s) return
      await Promise.all([loadPublic(s), loadComments(s)])
    },
    [loadComments, loadPublic]
  )

  useLoad((options) => {
    const raw = typeof options.slug === 'string' ? options.slug : ''
    const s = decodeSlug(raw)
    setSlug(s)
    void reloadAll(s)
  })

  usePullDownRefresh(() => {
    const inst = Taro.getCurrentInstance()
    const raw = inst?.router?.params?.slug
    const s = typeof raw === 'string' ? decodeSlug(raw) : slug
    void reloadAll(s).finally(() => {
      void Taro.stopPullDownRefresh()
    })
  })

  useShareAppMessage(() => {
    const inst = Taro.getCurrentInstance()
    const raw = inst?.router?.params?.slug
    const shareSlug = (typeof raw === 'string' ? decodeSlug(raw) : '') || data?.slug || slug
    return {
      title: data?.title || '藏品公开展示',
      path: shareSlug
        ? `/pages/collection-public/index?slug=${encodeURIComponent(shareSlug)}`
        : '/pages/collection-public/index',
    }
  })

  async function handleCopyLink() {
    const link =
      typeof globalThis !== 'undefined' &&
      'location' in globalThis &&
      typeof (globalThis as { location?: { href?: string } }).location?.href === 'string'
        ? (globalThis as { location: { href: string } }).location.href
        : `/pages/collection-public/index?slug=${encodeURIComponent(slug)}`
    try {
      await Taro.setClipboardData({ data: link })
      Taro.showToast({ title: '链接已复制', icon: 'success' })
    } catch {
      Taro.showToast({ title: '复制失败', icon: 'none' })
    }
  }

  const paragraphsRaw = data ? extractParagraphTextsFromPayload(data.contentPayload) : []
  const paragraphs = data
    ? filterParagraphsDedupedAgainstTitleSummary(paragraphsRaw, data.title, data.summary)
    : []
  const commentTargetCollectionNo = data?.collectionNo || commentsData?.collectionNo || slug
  const topLevelComments = commentsData?.items ?? []
  const commentsSummaryText = useMemo(() => {
    if (!commentsData) {
      return '评论会在通过审核后公开显示。'
    }
    return `共 ${commentsData.totalCommentCount} 条公开评论，其中一级评论 ${commentsData.topLevelCommentCount} 条。`
  }, [commentsData])

  async function handleSubmitComment() {
    const content = commentDraft.trim()
    if (!commentTargetCollectionNo) {
      Taro.showToast({ title: '缺少藏品标识', icon: 'none' })
      return
    }
    if (!content) {
      Taro.showToast({ title: '请先填写评论内容', icon: 'none' })
      return
    }

    setIsSubmittingComment(true)
    try {
      const payload = {
        collectionNo: commentTargetCollectionNo,
        content,
      } satisfies CreateCollectionCommentRequest
      const result = await requestMemberApi<
        CreateCollectionCommentResponseData,
        CreateCollectionCommentRequest
      >({
        path: '/member-api/collection-comments',
        method: 'POST',
        data: payload,
      })
      setCommentDraft('')
      await loadComments(commentTargetCollectionNo)
      Taro.showToast({
        title: buildCommentSubmissionMessage(result.status, 'comment'),
        icon: result.publishedAt ? 'success' : 'none',
      })
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : '评论提交失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handleSubmitReply(commentId: string) {
    const content = replyDrafts[commentId]?.trim() ?? ''
    if (!content) {
      Taro.showToast({ title: '请先填写回复内容', icon: 'none' })
      return
    }

    setReplySubmittingId(commentId)
    try {
      const payload = { content } satisfies ReplyCollectionCommentRequest
      const result = await requestMemberApi<
        ReplyCollectionCommentResponseData,
        ReplyCollectionCommentRequest
      >({
        path: `/member-api/collection-comments/${encodeURIComponent(commentId)}/replies`,
        method: 'POST',
        data: payload,
      })
      setReplyDrafts((current) => ({ ...current, [commentId]: '' }))
      setReplyTargetId(null)
      await loadComments(commentTargetCollectionNo)
      Taro.showToast({
        title: buildCommentSubmissionMessage(result.status, 'reply'),
        icon: result.publishedAt ? 'success' : 'none',
      })
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : '回复提交失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setReplySubmittingId(null)
    }
  }

  return (
    <PageShell
      title="公开展示"
      description="无需登录即可查看已公开发布的藏品快照；slug 一期与藏品编号一致。下拉可刷新，可复制链接；封面图可点击预览大图。"
      background="linear-gradient(180deg, #ecfdf5 0%, #f8fafc 45%, #eff6ff 100%)"
      heroBackground="#14532d"
      heroTextColor="#ecfdf5"
      heroDescriptionColor="rgba(236, 253, 245, 0.85)"
    >
      <View style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button
          type="default"
          onClick={() => {
            void Taro.switchTab({ url: '/pages/index/index' })
          }}
        >
          回首页
        </Button>
        <Button type="default" disabled={!slug} onClick={() => void handleCopyLink()}>
          复制本页链接
        </Button>
        <Button
          type="default"
          disabled={!slug || isLoading || isCommentsLoading}
          onClick={() => void reloadAll(slug)}
        >
          重新加载
        </Button>

        {slug ? (
          <Text style={{ fontSize: '11px', color: '#94a3b8' }}>访问标识（slug）：{slug}</Text>
        ) : null}

        {errorMessage ? (
          <StatusCard
            title="无法展示"
            description={errorMessage}
            background="#fef2f2"
            borderColor="#fca5a5"
            titleColor="#991b1b"
            descriptionColor="#b91c1c"
          />
        ) : null}
        {isLoading ? <Text style={{ color: '#64748b' }}>加载中…</Text> : null}

        {data ? (
          <View style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.coverImageUrl ? (
              <Image
                src={data.coverImageUrl}
                mode="aspectFill"
                style={{ width: '100%', height: '180px', borderRadius: '8px', backgroundColor: '#f1f5f9' }}
                onClick={() => {
                  const url = data.coverImageUrl
                  if (!url) return
                  void Taro.previewImage({ urls: [url], current: url })
                }}
              />
            ) : null}
            <Text style={{ fontSize: '20px', fontWeight: 700 }}>{data.title}</Text>
            <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '20px' }}>{data.summary}</Text>
            {paragraphs.length > 0 ? (
              <View style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>正文</Text>
                {paragraphs.map((line, index) => (
                  <Text
                    key={`${index}-${line.slice(0, 12)}`}
                    style={{ fontSize: '14px', color: '#334155', lineHeight: '22px' }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={{ fontSize: '12px', color: '#94a3b8' }}>
              藏品编号：{data.collectionNo} · 发布于 {data.publishedAt}
            </Text>
            <Text style={{ fontSize: '12px', color: '#94a3b8' }}>
              拥有者：{data.owner.nickname}（{data.owner.memberNo}）
            </Text>
          </View>
        ) : null}

        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginTop: '20px',
            padding: '28rpx',
            borderRadius: '24rpx',
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 16rpx 40rpx rgba(20, 83, 45, 0.08)',
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Text style={{ fontSize: '32rpx', fontWeight: '700', color: '#0f172a' }}>
              评论区
            </Text>
            <Text style={{ fontSize: '24rpx', lineHeight: '1.8', color: '#64748b' }}>
              {commentsSummaryText}
            </Text>
          </View>

          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '24rpx',
              borderRadius: '20rpx',
              background: '#f8fafc',
              border: '1px solid rgba(148, 163, 184, 0.18)',
            }}
          >
            <Text style={{ fontSize: '26rpx', fontWeight: '600', color: '#0f172a' }}>
              发表评论
            </Text>
            <Textarea
              value={commentDraft}
              maxlength={500}
              placeholder="写下你对这件藏品的感受；一期评论会先经过审核。"
              autoHeight
              onInput={(event) => setCommentDraft(event.detail.value)}
              style={{
                width: '100%',
                minHeight: '160rpx',
                padding: '20rpx',
                borderRadius: '18rpx',
                background: '#ffffff',
                boxSizing: 'border-box',
                color: '#0f172a',
                fontSize: '28rpx',
                lineHeight: '1.7',
              }}
            />
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <Text style={{ fontSize: '22rpx', color: '#94a3b8' }}>
                已输入 {commentDraft.trim().length} / 500
              </Text>
              <Button
                type="primary"
                loading={isSubmittingComment}
                disabled={isSubmittingComment || !commentTargetCollectionNo}
                onClick={() => void handleSubmitComment()}
              >
                提交评论
              </Button>
            </View>
          </View>

          {commentErrorMessage ? (
            <StatusCard
              title="评论暂时不可用"
              description={commentErrorMessage}
              background="#fff7ed"
              borderColor="#fdba74"
              titleColor="#9a3412"
              descriptionColor="#c2410c"
            />
          ) : null}

          {isCommentsLoading ? (
            <Text style={{ color: '#64748b' }}>评论加载中…</Text>
          ) : topLevelComments.length === 0 ? (
            <StatusCard
              title="还没有公开评论"
              description="你可以成为第一位留言的人。若评论进入人工审核或未通过审核，不会立即出现在这里。"
              background="#eff6ff"
              borderColor="#93c5fd"
              titleColor="#1d4ed8"
              descriptionColor="#2563eb"
            />
          ) : (
            <View style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topLevelComments.map((comment) => {
                const replyDraft = replyDrafts[comment.commentId] ?? ''
                const isReplying = replyTargetId === comment.commentId
                const isSubmittingReply = replySubmittingId === comment.commentId

                return (
                  <View
                    key={comment.commentId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      padding: '24rpx',
                      borderRadius: '22rpx',
                      background: '#ffffff',
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                    }}
                  >
                    <View style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <View
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <Text style={{ fontSize: '26rpx', fontWeight: '600', color: '#0f172a' }}>
                          {comment.memberNickname}
                        </Text>
                        <Text style={{ fontSize: '22rpx', color: '#94a3b8' }}>
                          {formatCommentPublishedAt(comment.publishedAt)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: '28rpx', lineHeight: '1.8', color: '#334155' }}>
                        {comment.content}
                      </Text>
                    </View>

                    <View
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <Text style={{ fontSize: '22rpx', color: '#64748b' }}>
                        {comment.replyCount > 0
                          ? `已有 ${comment.replyCount} 条公开回复`
                          : '还没有公开回复'}
                      </Text>
                      <Button
                        type="default"
                        size="mini"
                        onClick={() =>
                          setReplyTargetId((current) =>
                            current === comment.commentId ? null : comment.commentId
                          )
                        }
                      >
                        {isReplying ? '收起回复框' : '回复这条评论'}
                      </Button>
                    </View>

                    {comment.replies.length > 0 ? (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          padding: '18rpx',
                          borderRadius: '18rpx',
                          background: '#f8fafc',
                        }}
                      >
                        {comment.replies.map((reply) => (
                          <View
                            key={reply.commentId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              paddingBottom: '10rpx',
                              borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                            }}
                          >
                            <View
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: '24rpx',
                                  fontWeight: '600',
                                  color: '#0f172a',
                                }}
                              >
                                {reply.memberNickname}
                              </Text>
                              <Text style={{ fontSize: '22rpx', color: '#94a3b8' }}>
                                {formatCommentPublishedAt(reply.publishedAt)}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: '26rpx',
                                lineHeight: '1.8',
                                color: '#475569',
                              }}
                            >
                              {reply.content}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {isReplying ? (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '18rpx',
                          borderRadius: '18rpx',
                          background: '#f8fafc',
                        }}
                      >
                        <Text style={{ fontSize: '24rpx', fontWeight: '600', color: '#0f172a' }}>
                          回复 {comment.memberNickname}
                        </Text>
                        <Textarea
                          value={replyDraft}
                          maxlength={300}
                          placeholder="一期仅支持回复一级评论；回复同样会进入审核。"
                          autoHeight
                          onInput={(event) =>
                            setReplyDrafts((current) => ({
                              ...current,
                              [comment.commentId]: event.detail.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            minHeight: '120rpx',
                            padding: '18rpx',
                            borderRadius: '16rpx',
                            background: '#ffffff',
                            boxSizing: 'border-box',
                            color: '#0f172a',
                            fontSize: '28rpx',
                            lineHeight: '1.7',
                          }}
                        />
                        <View
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <Text style={{ fontSize: '22rpx', color: '#94a3b8' }}>
                            已输入 {replyDraft.trim().length} / 300
                          </Text>
                          <Button
                            type="primary"
                            size="mini"
                            loading={isSubmittingReply}
                            disabled={isSubmittingReply}
                            onClick={() => void handleSubmitReply(comment.commentId)}
                          >
                            提交回复
                          </Button>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {!isLoading && !data && !errorMessage && slug ? (
          <Text style={{ color: '#64748b' }}>暂无数据</Text>
        ) : null}
        {!slug ? <Text style={{ color: '#64748b' }}>缺少 slug 参数</Text> : null}
      </View>
    </PageShell>
  )
}
