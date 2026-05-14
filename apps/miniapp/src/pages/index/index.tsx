import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 小程序首页。
 * 当前作为 M1 领取闭环入口，优先承接“激活藏品”和“查看我的藏品”两条主动作。
 */
export default function IndexPage() {
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
        description='当前小程序页面默认使用联调阶段 mock 会员身份，并请求本地 member-api。后续接入真实微信登录时，只需替换共享请求层里的会员上下文注入。'
        background='#eff6ff'
        borderColor='#93c5fd'
        titleColor='#1d4ed8'
        descriptionColor='#1e40af'
      />
    </PageShell>
  )
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
