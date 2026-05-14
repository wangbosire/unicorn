import { useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type {
  ActivateCollectionRequest,
  ActivateCollectionResponseData,
} from '../../../../../packages/api-contracts/src/member/collection-activation'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'

/**
 * M1 激活页。
 * 当前提供最小可用闭环：输入激活码、请求会员激活接口、展示结果并跳转到我的藏品。
 */
export default function ActivatePage() {
  const [activationCode, setActivationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<ActivateCollectionResponseData | null>(
    null
  )

  async function handleActivate() {
    const normalizedCode = activationCode.trim().toUpperCase()

    if (!normalizedCode) {
      Taro.showToast({
        title: '请输入激活码',
        icon: 'none',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await requestMemberApi<
        ActivateCollectionResponseData,
        ActivateCollectionRequest
      >({
        path: '/member-api/collection-activation',
        method: 'POST',
        data: {
          activationCode: normalizedCode,
        } satisfies ActivateCollectionRequest,
      })
      setLastResult(result)
      setActivationCode('')

      Taro.showToast({
        title: '激活成功',
        icon: 'success',
      })

      setTimeout(() => {
        void Taro.navigateTo({
          url: '/pages/collections/index',
        })
      }, 350)
    } catch (error) {
      const errorMessage =
        error instanceof MemberApiError
          ? mapActivationErrorMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : '激活失败，请稍后重试'

      Taro.showToast({
        title: errorMessage,
        icon: 'none',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      title='激活我的藏品'
      description='输入运营发放的激活码，完成领取后即可在“我的藏品”中查看并继续编辑内容。'
      background='linear-gradient(180deg, #fff7ed 0%, #f8fafc 36%, #eef2ff 100%)'
      heroBackground='#0f172a'
      heroTextColor='#f8fafc'
      heroDescriptionColor='rgba(248, 250, 252, 0.82)'
    >
      <View
        style={{
          padding: '32rpx',
          borderRadius: '28rpx',
          background: 'rgba(255, 255, 255, 0.88)',
          boxShadow: '0 18rpx 48rpx rgba(148, 163, 184, 0.18)',
          backdropFilter: 'blur(12rpx)',
        }}
      >
        <Text
          style={{
            display: 'block',
            marginBottom: '16rpx',
            fontSize: '28rpx',
            fontWeight: '600',
            color: '#0f172a',
          }}
        >
          激活码
        </Text>
        <Input
          value={activationCode}
          maxlength={32}
          placeholder='例如：ABCD-EFGH-IJKL'
          onInput={(event) => setActivationCode(event.detail.value)}
          style={{
            height: '92rpx',
            padding: '0 24rpx',
            borderRadius: '20rpx',
            background: '#f8fafc',
            border: '2rpx solid #cbd5e1',
            fontSize: '30rpx',
            color: '#0f172a',
          }}
        />

        <Text
          style={{
            display: 'block',
            marginTop: '16rpx',
            marginBottom: '28rpx',
            color: '#64748b',
            lineHeight: '1.7',
          }}
        >
          当前使用联调阶段会员身份。后续接入真实微信登录后，这里的会员上下文会自动替换。
        </Text>

        <Button
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={handleActivate}
          style={{
            height: '92rpx',
            lineHeight: '92rpx',
            borderRadius: '999rpx',
            border: 'none',
            background: '#f97316',
            color: '#fff7ed',
            fontSize: '30rpx',
            fontWeight: '600',
          }}
        >
          {isSubmitting ? '正在激活...' : '立即激活'}
        </Button>
      </View>

      {lastResult ? (
        <View style={{ marginTop: '28rpx' }}>
          <StatusCard
            title='藏品领取成功'
            description={`藏品编号：${lastResult.collection.collectionNo}\n当前状态：${lastResult.collection.status}`}
            background='#ecfdf5'
            borderColor='#86efac'
            titleColor='#166534'
            descriptionColor='#166534'
          />
        </View>
      ) : null}
    </PageShell>
  )
}

/**
 * 将后端错误码转换为小程序侧可理解提示，避免直接暴露英文错误消息。
 */
function mapActivationErrorMessage(code?: string, fallbackMessage?: string): string {
  switch (code) {
    case 'ACTIVATION_CODE_INVALID':
      return '激活码不存在，请检查后重试'
    case 'ACTIVATION_CODE_USED':
      return '该激活码已被使用'
    case 'ACTIVATION_CODE_EXPIRED':
      return '该激活码已过期'
    case 'ACTIVATION_CODE_VOIDED':
      return '该激活码已作废'
    case 'UNAUTHORIZED':
      return '会员登录状态已失效，请重新进入页面'
    default:
      return fallbackMessage || '激活失败，请稍后重试'
  }
}
