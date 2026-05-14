import { Text, View } from '@tarojs/components'

type StatusCardProps = {
  title: string
  description: string
  background: string
  borderColor: string
  titleColor: string
  descriptionColor: string
}

/**
 * 通用状态卡片。
 * 用于统一展示加载、错误、空态和成功反馈，避免每个页面重复维护同类结构。
 */
export function StatusCard(props: StatusCardProps) {
  return (
    <View
      style={{
        padding: '30rpx 28rpx',
        borderRadius: '24rpx',
        background: props.background,
        border: `2rpx solid ${props.borderColor}`,
      }}
    >
      <Text
        style={{
          display: 'block',
          marginBottom: '10rpx',
          fontSize: '30rpx',
          fontWeight: '600',
          color: props.titleColor,
        }}
      >
        {props.title}
      </Text>
      <Text
        style={{
          display: 'block',
          lineHeight: '1.8',
          color: props.descriptionColor,
        }}
      >
        {props.description}
      </Text>
    </View>
  )
}
