import { Text, View } from '@tarojs/components'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * 消息中心页。
 * 当前按执行计划保持为 M4 范围说明页，避免在 M1 阶段误导用户认为通知能力已经可用。
 */
export default function MessagesPage() {
  return (
    <PageShell
      title='消息中心'
      description='通知中心属于一期后续里程碑范围。当前页面用于说明规划边界，避免和 M1 领取主链路混淆。'
      background='linear-gradient(180deg, #fef2f2 0%, #f8fafc 40%, #fff7ed 100%)'
      heroBackground='#7f1d1d'
      heroTextColor='#fef2f2'
      heroDescriptionColor='rgba(254, 242, 242, 0.82)'
    >
      <StatusCard
        title='当前阶段暂未开放'
        description='按照现有执行计划，消息通知、站内信和站外触达能力归属于 M4“流转与通知闭环”。当前小程序优先保障 M1 的领取闭环，所以这里暂时只保留阶段说明。'
        background='#fff1f2'
        borderColor='#fda4af'
        titleColor='#9f1239'
        descriptionColor='#be123c'
      />

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
          计划中的能力包括：激活结果通知、审核状态通知、内容公开提醒、转让相关通知，以及后续站内信与微信侧触达记录。
        </Text>
      </View>
    </PageShell>
  )
}
