import { useCallback, useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { DEFAULT_DEV_MEMBER_ID } from '../../lib/default-dev-member'
import {
  clearMemberSession,
  getMemberSessionSummary,
  loginWechatMiniapp,
  MemberApiError,
  persistMemberSession,
} from '../../apis/member/member-api'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import { formatSessionSourceLabel } from '../../lib/member-session-display'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 小程序首页。
 * 承接 M1 激活与「我的藏品」入口，并作为 M2 内容编辑 / 公开展示联调的总入口说明。
 */
export default function IndexPage() {
  const [isWechatLoginLoading, setIsWechatLoginLoading] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(() => getMemberSessionSummary())

  const refreshSessionSummary = useCallback(() => {
    setSessionSummary(getMemberSessionSummary())
  }, [])

  useEffect(() => {
    refreshSessionSummary()
  }, [refreshSessionSummary])

  useDidShow(() => {
    refreshSessionSummary()
  })

  usePullDownRefresh(() => {
    refreshSessionSummary()
    void Taro.stopPullDownRefresh()
  })

  async function handleWechatLogin() {
    setIsWechatLoginLoading(true)
    try {
      const login = await Taro.login()
      if (!login.code) {
        Taro.showToast({ title: '未取得登录凭证，请重试', icon: 'none' })
        return
      }
      const session = await loginWechatMiniapp(login.code)
      persistMemberSession(session.accessToken, session.member.id)
      Taro.showToast({
        title: `已登录 ${session.member.memberNo}`,
        icon: 'success',
      })
      refreshSessionSummary()
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? mapWechatLoginErrorMessage(error.code, formatMemberApiErrorMessage(error))
          : error instanceof Error
            ? error.message
            : '登录失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsWechatLoginLoading(false)
    }
  }

  function handleClearSession() {
    clearMemberSession()
    refreshSessionSummary()
    Taro.showToast({ title: `已恢复默认联调会员 ${DEFAULT_DEV_MEMBER_ID}`, icon: 'none' })
  }

  return (
    <PageShell
      title='Unicorn 数字藏品'
      description='先完成领取，再在「我的藏品」中编辑内容、提交审核；机审通过后可查看公开展示。下拉可刷新首页的联调会话摘要。'
      background='linear-gradient(180deg, #fef3c7 0%, #f8fafc 38%, #dbeafe 100%)'
      heroBackground='#1e293b'
      heroTextColor='#f8fafc'
      heroDescriptionColor='rgba(248, 250, 252, 0.82)'
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20rpx',
          marginBottom: '28rpx',
        }}
      >
        <ActionCard
          eyebrow='主入口'
          title='激活我的藏品'
          description='输入运营发放的激活码，完成领取后自动进入我的藏品。'
          buttonLabel='去激活'
          background='linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
          buttonBackground='#f97316'
          buttonColor='#fff7ed'
          onClick={() => {
            void Taro.navigateTo({ url: '/pages/activate/index' })
          }}
        />

        <View
          style={{
            padding: '28rpx 26rpx',
            borderRadius: '28rpx',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            boxShadow: '0 18rpx 44rpx rgba(148, 163, 184, 0.14)',
          }}
        >
          <Text
            style={{
              display: 'block',
              marginBottom: '10rpx',
              fontSize: '24rpx',
              fontWeight: '600',
              color: '#5b21b6',
            }}
          >
            会员身份
          </Text>
          <Text
            style={{
              display: 'block',
              marginBottom: '20rpx',
              lineHeight: '1.75',
              color: '#334155',
              fontSize: '28rpx',
            }}
          >
            使用微信登录后，激活与藏品请求会携带后端返回的 mock token；仍可在开发者工具清除存储或点下方按钮恢复默认种子会员。
          </Text>
          <View style={{ display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
            <Button
              loading={isWechatLoginLoading}
              disabled={isWechatLoginLoading}
              onClick={() => {
                void handleWechatLogin()
              }}
              style={{
                height: '84rpx',
                lineHeight: '84rpx',
                borderRadius: '999rpx',
                border: 'none',
                background: '#7c3aed',
                color: '#f5f3ff',
                fontSize: '28rpx',
                fontWeight: '600',
              }}
            >
              {isWechatLoginLoading ? '登录中...' : '微信一键登录'}
            </Button>
            <Button
              disabled={isWechatLoginLoading}
              onClick={handleClearSession}
              style={{
                height: '72rpx',
                lineHeight: '72rpx',
                borderRadius: '999rpx',
                border: '2rpx solid #c4b5fd',
                background: 'transparent',
                color: '#5b21b6',
                fontSize: '26rpx',
                fontWeight: '500',
              }}
            >
              恢复默认联调会员
            </Button>
            <View
              style={{
                marginTop: '8rpx',
                paddingTop: '20rpx',
                borderTop: '2rpx solid rgba(196, 181, 253, 0.55)',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  fontSize: '22rpx',
                  fontWeight: '600',
                  color: '#6d28d9',
                }}
              >
                当前请求上下文
              </Text>
              <Text
                style={{
                  display: 'block',
                  fontSize: '22rpx',
                  color: '#475569',
                  lineHeight: '1.65',
                }}
              >
                会员主键：{sessionSummary.memberId}
                {'\n'}
                会话：{formatSessionSourceLabel(sessionSummary.sessionSource)}
                {'\n'}
                API：{sessionSummary.memberApiBaseUrl}
              </Text>
            </View>
          </View>
        </View>

        <ActionCard
          eyebrow='领取结果'
          title='查看我的藏品'
          description='查看已领取藏品；可进入单件编辑、提交审核，已公开藏品可直接打开公开展示页。'
          buttonLabel='查看藏品'
          background='linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'
          buttonBackground='#0891b2'
          buttonColor='#ecfeff'
          onClick={() => {
            void Taro.switchTab({ url: '/pages/collections/index' })
          }}
        />

        <Button
          onClick={() => {
            void Taro.navigateTo({ url: '/pages/messages/index' })
          }}
          style={{
            height: '72rpx',
            lineHeight: '72rpx',
            borderRadius: '999rpx',
            border: '2rpx solid #cbd5e1',
            background: 'rgba(255, 255, 255, 0.75)',
            color: '#475569',
            fontSize: '26rpx',
            fontWeight: '500',
          }}
        >
          消息中心（规划说明）
        </Button>
      </View>

      <StatusCard
        title='当前联调说明'
        description={`默认使用联调种子会员 ${DEFAULT_DEV_MEMBER_ID} 与本地 member-api。首页支持微信一键登录写入 unicorn_member_access_token 与 unicorn_member_id；亦可手动写入 unicorn_member_api_base_url 覆盖接口基地址。`}
        background='#eff6ff'
        borderColor='#93c5fd'
        titleColor='#1d4ed8'
        descriptionColor='#1e40af'
      />
    </PageShell>
  )
}

function mapWechatLoginErrorMessage(code?: string, fallbackMessage?: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return '登录参数无效，请重试'
    case 'MEMBER_ACCOUNT_FROZEN':
      return '当前会员账号已冻结'
    default:
      return fallbackMessage || '登录失败，请稍后重试'
  }
}

type ActionCardProps = {
  eyebrow: string
  title: string
  description: string
  buttonLabel: string
  background: string
  buttonBackground: string
  buttonColor: string
  onClick: () => void
}

function ActionCard(props: ActionCardProps) {
  return (
    <View
      style={{
        padding: '30rpx 28rpx',
        borderRadius: '28rpx',
        background: props.background,
        boxShadow: '0 18rpx 44rpx rgba(148, 163, 184, 0.16)',
      }}
    >
      <Text
        style={{
          display: 'block',
          marginBottom: '10rpx',
          fontSize: '24rpx',
          fontWeight: '600',
          color: '#92400e',
        }}
      >
        {props.eyebrow}
      </Text>
      <Text
        style={{
          display: 'block',
          marginBottom: '12rpx',
          fontSize: '34rpx',
          fontWeight: '700',
          color: '#0f172a',
        }}
      >
        {props.title}
      </Text>
      <Text
        style={{
          display: 'block',
          marginBottom: '24rpx',
          lineHeight: '1.8',
          color: '#334155',
        }}
      >
        {props.description}
      </Text>
      <Button
        onClick={props.onClick}
        style={{
          height: '84rpx',
          lineHeight: '84rpx',
          borderRadius: '999rpx',
          border: 'none',
          background: props.buttonBackground,
          color: props.buttonColor,
          fontSize: '28rpx',
          fontWeight: '600',
        }}
      >
        {props.buttonLabel}
      </Button>
    </View>
  )
}
