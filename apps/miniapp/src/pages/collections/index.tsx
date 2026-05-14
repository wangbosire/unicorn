import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import type {
  ListMyCollectionsQuery,
  ListMyCollectionsResponseData,
  MyCollectionListItem,
} from '../../../../../packages/api-contracts/src/member/my-collections'
import { requestMemberApi } from '../../apis/member/member-api'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 我的藏品页。
 * 当前聚焦 M1 领取闭环承接：展示当前会员已领取的藏品结果，便于验证激活成功。
 */
export default function CollectionsPage() {
  const [items, setItems] = useState<MyCollectionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadCollections() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await requestMemberApi<
        ListMyCollectionsResponseData,
        ListMyCollectionsQuery
      >({
        path: '/member-api/my/collections',
        method: 'GET',
        data: {
          page: 1,
          pageSize: 20,
        } satisfies ListMyCollectionsQuery,
      })

      setItems(result.items)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '加载藏品失败，请稍后重试'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCollections()
  }, [])

  useDidShow(() => {
    void loadCollections()
  })

  return (
    <PageShell
      title='我的藏品'
      description='这里展示当前会员已经领取成功的藏品，后续内容编辑和提交审核都会从这里继续进入。'
      background='linear-gradient(180deg, #ecfeff 0%, #f8fafc 35%, #fff7ed 100%)'
      heroBackground='#082f49'
      heroTextColor='#ecfeff'
      heroDescriptionColor='rgba(236, 254, 255, 0.82)'
    >
      <Button
        onClick={() => void loadCollections()}
        loading={isLoading}
        disabled={isLoading}
        style={{
          marginBottom: '24rpx',
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: 'none',
          background: '#0891b2',
          color: '#ecfeff',
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        {isLoading ? '正在刷新...' : '刷新我的藏品'}
      </Button>

      {isLoading ? (
        <StatusCard
          title='正在加载藏品'
          description='系统正在拉取当前会员已领取的藏品，请稍候。'
          background='#ffffff'
          borderColor='#cbd5e1'
          titleColor='#0f172a'
          descriptionColor='#64748b'
        />
      ) : errorMessage ? (
        <StatusCard
          title='加载失败'
          description={errorMessage}
          background='#fef2f2'
          borderColor='#fca5a5'
          titleColor='#991b1b'
          descriptionColor='#b91c1c'
        />
      ) : items.length === 0 ? (
        <StatusCard
          title='还没有藏品'
          description='你还没有领取到藏品，可以先回到激活页输入激活码。'
          background='#fff7ed'
          borderColor='#fdba74'
          titleColor='#9a3412'
          descriptionColor='#c2410c'
        />
      ) : (
        <View style={{ display: 'flex', flexDirection: 'column', gap: '20rpx' }}>
          {items.map((item) => (
            <View
              key={item.id}
              style={{
                padding: '28rpx',
                borderRadius: '24rpx',
                background: 'rgba(255, 255, 255, 0.92)',
                boxShadow: '0 16rpx 44rpx rgba(148, 163, 184, 0.16)',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  marginBottom: '10rpx',
                  fontSize: '32rpx',
                  fontWeight: '700',
                  color: '#0f172a',
                }}
              >
                {item.collectionNo}
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  color: '#0f172a',
                }}
              >
                所属系列：{item.seriesName}
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  color: '#334155',
                }}
              >
                藏品状态：{mapCollectionStatus(item.status)}
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  color: '#334155',
                }}
              >
                展示状态：{mapPublishStatus(item.contentPublishStatus)}
              </Text>
              <Text style={{ display: 'block', color: '#64748b' }}>
                领取时间：{formatClaimedAt(item.claimedAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </PageShell>
  )
}

function mapCollectionStatus(status: string): string {
  switch (status) {
    case 'PENDING_CLAIM':
      return '待领取'
    case 'OWNED':
      return '已领取'
    case 'FROZEN':
      return '已冻结'
    default:
      return status
  }
}

function mapPublishStatus(status: string): string {
  switch (status) {
    case 'UNPUBLISHED':
      return '未公开'
    case 'PUBLISHED':
      return '已公开'
    case 'TAKEDOWN':
      return '已下架'
    default:
      return status
  }
}

function formatClaimedAt(timestamp: number | null): string {
  if (!timestamp) {
    return '暂未记录'
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
  })
}
