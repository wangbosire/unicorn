import { useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import type { GetCurrentMemberResponseData } from '@contracts/member/auth'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 会员信息页。
 * 展示当前会员身份；提供「我的藏品」快捷入口，便于从个人页进入 M2 内容编辑与公开展示联调。
 */
export default function ProfilePage() {
  const [member, setMember] = useState<GetCurrentMemberResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadCurrentMember() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await requestMemberApi<GetCurrentMemberResponseData>({
        path: '/member-api/auth/me',
        method: 'GET',
      })

      setMember(result)
    } catch (error) {
      setErrorMessage(
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : error instanceof Error
            ? error.message
            : '加载会员信息失败，请稍后重试'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCurrentMember()
  }, [])

  useDidShow(() => {
    void loadCurrentMember()
  })

  usePullDownRefresh(() => {
    void loadCurrentMember().finally(() => {
      void Taro.stopPullDownRefresh()
    })
  })

  return (
    <PageShell
      title='当前会员'
      description='这里展示当前小程序会话所使用的会员身份；下方可进入我的藏品，继续编辑内容、提交审核或查看公开展示。下拉可刷新。'
      background='linear-gradient(180deg, #ede9fe 0%, #f8fafc 40%, #ecfeff 100%)'
      heroBackground='#312e81'
      heroTextColor='#eef2ff'
      heroDescriptionColor='rgba(238, 242, 255, 0.82)'
    >
      <Button
        onClick={() => void loadCurrentMember()}
        loading={isLoading}
        disabled={isLoading}
        style={{
          marginBottom: '16rpx',
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: 'none',
          background: '#4f46e5',
          color: '#eef2ff',
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        {isLoading ? '正在刷新...' : '刷新会员信息'}
      </Button>
      <Button
        onClick={() => {
          void Taro.switchTab({ url: '/pages/collections/index' })
        }}
        style={{
          marginBottom: '24rpx',
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: '2rpx solid #a5b4fc',
          background: 'rgba(255, 255, 255, 0.65)',
          color: '#312e81',
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        前往我的藏品
      </Button>
      <Button
        onClick={() => {
          void Taro.navigateTo({ url: '/pages/transfers/index' })
        }}
        style={{
          marginBottom: '24rpx',
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: '2rpx solid #86efac',
          background: 'rgba(255, 255, 255, 0.65)',
          color: '#166534',
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        查看我的转让
      </Button>

      {isLoading ? (
        <StatusCard
          title='正在加载会员信息'
          description='系统正在确认当前小程序会话的会员上下文，请稍候。'
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
      ) : member ? (
        <View
          style={{
            padding: '30rpx 28rpx',
            borderRadius: '28rpx',
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 16rpx 44rpx rgba(99, 102, 241, 0.14)',
          }}
        >
          <IdentityRow label='会员编号' value={member.memberNo} />
          <IdentityRow label='昵称' value={member.nickname} />
          <IdentityRow label='会员状态' value={mapMemberStatus(member.status)} />
          <IdentityRow label='会员主键' value={member.id} />
          <IdentityRow
            label='头像地址'
            value={member.avatarUrl || '当前未设置头像'}
            last
          />
        </View>
      ) : (
        <StatusCard
          title='暂无会员信息'
          description='当前没有读取到会员资料，请稍后重试。'
          background='#fff7ed'
          borderColor='#fdba74'
          titleColor='#9a3412'
          descriptionColor='#c2410c'
        />
      )}
    </PageShell>
  )
}

type IdentityRowProps = {
  label: string
  value: string
  last?: boolean
}

function IdentityRow(props: IdentityRowProps) {
  return (
    <View
      style={{
        paddingBottom: props.last ? '0' : '22rpx',
        marginBottom: props.last ? '0' : '22rpx',
        borderBottom: props.last ? 'none' : '2rpx solid #e2e8f0',
      }}
    >
      <Text
        style={{
          display: 'block',
          marginBottom: '8rpx',
          fontSize: '24rpx',
          fontWeight: '600',
          color: '#6366f1',
        }}
      >
        {props.label}
      </Text>
      <Text
        style={{
          display: 'block',
          lineHeight: '1.8',
          color: '#0f172a',
          wordBreak: 'break-all',
        }}
      >
        {props.value}
      </Text>
    </View>
  )
}

function mapMemberStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '正常'
    case 'FROZEN':
      return '已冻结'
    default:
      return status
  }
}
