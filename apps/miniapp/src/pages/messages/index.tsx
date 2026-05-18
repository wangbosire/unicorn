import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import type {
  ListMemberMessagesQuery,
  ListMemberMessagesResponseData,
} from '@contracts/member/messages'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import {
  formatMemberMessageTimestamp,
  formatMemberMessageType,
} from '../../lib/member-messages'

/**
 * 消息中心页。
 * 展示当前会员真实站内消息，并保留后续渠道触达能力说明。
 */
export default function MessagesPage() {
  const [messages, setMessages] = useState<ListMemberMessagesResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadMessages() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await requestMemberApi<
        ListMemberMessagesResponseData,
        ListMemberMessagesQuery
      >({
        path: '/member-api/my/messages',
        method: 'GET',
        data: {
          page: 1,
          pageSize: 20,
        } satisfies ListMemberMessagesQuery,
      })
      setMessages(result)
    } catch (error) {
      setErrorMessage(
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : error instanceof Error
            ? error.message
            : '消息加载失败，请稍后重试'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
  }, [])

  useDidShow(() => {
    void loadMessages()
  })

  usePullDownRefresh(() => {
    void loadMessages().finally(() => {
      void Taro.stopPullDownRefresh()
    })
  })

  return (
    <PageShell
      title='消息中心'
      description='查看当前会员的站内消息记录；激活结果、审核通知、评论审核结果与转让事件会按业务进度汇总到这里。下拉可刷新。'
      background='linear-gradient(180deg, #fef2f2 0%, #f8fafc 40%, #fff7ed 100%)'
      heroBackground='#7f1d1d'
      heroTextColor='#fef2f2'
      heroDescriptionColor='rgba(254, 242, 242, 0.82)'
    >
      <Button
        onClick={() => void loadMessages()}
        loading={isLoading}
        disabled={isLoading}
        style={{
          marginBottom: '24rpx',
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: 'none',
          background: '#be123c',
          color: '#fff1f2',
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        {isLoading ? '正在刷新...' : '刷新消息中心'}
      </Button>

      {isLoading ? (
        <StatusCard
          title='正在加载消息'
          description='系统正在读取当前会员消息中心，请稍候。'
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
          borderColor='#fda4af'
          titleColor='#9f1239'
          descriptionColor='#be123c'
        />
      ) : !messages || messages.items.length === 0 ? (
        <StatusCard
          title='暂时还没有消息'
          description='当激活、审核、评论审核或转让事件发生时，站内消息会出现在这里。'
          background='#fff1f2'
          borderColor='#fda4af'
          titleColor='#9f1239'
          descriptionColor='#be123c'
        />
      ) : (
        <View style={{ display: 'flex', flexDirection: 'column', gap: '20rpx' }}>
          {messages.items.map((item) => (
            <View
              key={item.id}
              style={{
                padding: '28rpx',
                borderRadius: '24rpx',
                background: item.isRead ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.96)',
                boxShadow: '0 16rpx 40rpx rgba(190, 24, 93, 0.10)',
                border: item.isRead
                  ? '2rpx solid rgba(244, 114, 182, 0.18)'
                  : '2rpx solid rgba(190, 24, 93, 0.22)',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  fontSize: '24rpx',
                  fontWeight: '600',
                  color: '#be123c',
                }}
              >
                {formatMemberMessageType(item.messageType)}
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginBottom: '12rpx',
                  fontSize: '30rpx',
                  fontWeight: '700',
                  color: '#0f172a',
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  display: 'block',
                  marginBottom: '14rpx',
                  lineHeight: '1.8',
                  color: '#475569',
                }}
              >
                {item.content}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#64748b' }}>
                创建时间：{formatMemberMessageTimestamp(item.createdAt)}
              </Text>
              <Text style={{ display: 'block', color: '#64748b' }}>
                状态：{item.isRead ? '已读' : '未读'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={{
          marginTop: '24rpx',
          padding: '28rpx',
          borderRadius: '24rpx',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 16rpx 40rpx rgba(248, 113, 113, 0.12)',
        }}
      >
        <Text
          style={{
            display: 'block',
            marginBottom: '12rpx',
            fontSize: '30rpx',
            fontWeight: '700',
            color: '#0f172a',
          }}
        >
          后续这里会承接什么
        </Text>
        <Text
          style={{
            display: 'block',
            lineHeight: '1.8',
            color: '#475569',
          }}
        >
          当前已接入站内消息读取；后续会继续补齐消息模板管理、消息已读回写、小程序订阅消息与公众号触达等完整通知能力。
        </Text>
      </View>
    </PageShell>
  )
}
