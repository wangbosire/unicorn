import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  clearMemberSession,
  loginWechatMiniapp,
  MemberApiError,
  persistMemberSession,
} from '../../apis/member/member-api'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 小程序首页。
 * 当前作为 M1 领取闭环入口，优先承接“激活藏品”和“查看我的藏品”两条主动作。
 */
export default function IndexPage() {
  const [isWechatLoginLoading, setIsWechatLoginLoading] = useState(false)

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
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? mapWechatLoginErrorMessage(error.code, error.message)
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
    Taro.showToast({ title: '已恢复默认联调会员 mem_1', icon: 'none' })
  }

  return (
    <PageShell
      title='Unicorn 数字藏品'
      description='先完成领取，再进入内容编辑和展示流程。当前首页优先服务 M1 最小发行闭环的联调与演示。'
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
            使用微信登录后，激活与藏品请求会携带后端返回的 mock token；仍可在开发者工具清除存储或点下方按钮恢复 mem_1。
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
              恢复默认联调会员 mem_1
            </Button>
          </View>
        </View>

        <ActionCard
          eyebrow='领取结果'
          title='查看我的藏品'
          description='查看当前会员已领取的藏品结果，后续内容编辑会从这里继续进入。'
          buttonLabel='查看藏品'
          background='linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'
          buttonBackground='#0891b2'
          buttonColor='#ecfeff'
          onClick={() => {
            void Taro.navigateTo({ url: '/pages/collections/index' })
          }}
        />
      </View>

      <StatusCard
        title='当前联调说明'
        description='默认使用联调种子会员 mem_1 与本地 member-api。首页支持微信一键登录写入 unicorn_member_access_token 与 unicorn_member_id；亦可手动写入 unicorn_member_api_base_url 覆盖接口基地址。'
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
