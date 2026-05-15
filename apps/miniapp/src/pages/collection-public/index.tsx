import { useCallback, useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useShareAppMessage } from '@tarojs/taro'
import type { GetPublicCollectionResponseData } from '@contracts/public/collections/get-public-collection.response'
import { PublicApiError, requestPublicApi } from '../../apis/public/public-api'
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
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  useLoad((options) => {
    const raw = typeof options.slug === 'string' ? options.slug : ''
    const s = decodeSlug(raw)
    setSlug(s)
    void loadPublic(s)
  })

  usePullDownRefresh(() => {
    const inst = Taro.getCurrentInstance()
    const raw = inst?.router?.params?.slug
    const s = typeof raw === 'string' ? decodeSlug(raw) : slug
    void loadPublic(s).finally(() => {
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
        <Button type="default" disabled={!slug || isLoading} onClick={() => void loadPublic(slug)}>
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

        {!isLoading && !data && !errorMessage && slug ? (
          <Text style={{ color: '#64748b' }}>暂无数据</Text>
        ) : null}
        {!slug ? <Text style={{ color: '#64748b' }}>缺少 slug 参数</Text> : null}
      </View>
    </PageShell>
  )
}
