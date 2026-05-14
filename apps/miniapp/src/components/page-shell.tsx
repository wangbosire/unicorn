import type { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

type PageShellProps = {
  title: string
  description: string
  background: string
  heroBackground: string
  heroTextColor: string
  heroDescriptionColor: string
  children: ReactNode
}

/**
 * 小程序页面通用外层壳。
 * 统一 M1 联调阶段页面的背景、头图和基础留白，减少页面间重复样式。
 */
export function PageShell(props: PageShellProps) {
  return (
    <View
      style={{
        minHeight: '100vh',
        padding: '44rpx 28rpx 56rpx',
        background: props.background,
        boxSizing: 'border-box',
      }}
    >
      <View
        style={{
          marginBottom: '28rpx',
          padding: '36rpx 32rpx',
          borderRadius: '28rpx',
          background: props.heroBackground,
          color: props.heroTextColor,
          boxShadow: '0 24rpx 60rpx rgba(15, 23, 42, 0.18)',
        }}
      >
        <Text
          style={{
            display: 'block',
            marginBottom: '12rpx',
            fontSize: '48rpx',
            fontWeight: '700',
          }}
        >
          {props.title}
        </Text>
        <Text
          style={{
            display: 'block',
            lineHeight: '1.7',
            color: props.heroDescriptionColor,
          }}
        >
          {props.description}
        </Text>
      </View>

      {props.children}
    </View>
  )
}
