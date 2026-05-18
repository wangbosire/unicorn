import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import type {
  CancelMemberTransferResponseData,
  CreateMemberTransferRequest,
  CreateMemberTransferResponseData,
  ListMemberTransfersQuery,
  ListMemberTransfersResponseData,
} from '@contracts/member/transfers'
import { MemberApiError, requestMemberApi } from '../../apis/member/member-api'
import { PageShell } from '../../components/page-shell'
import { StatusCard } from '../../components/status-card'
import { formatMemberApiErrorMessage } from '../../lib/member-api-errors'
import {
  formatMemberTransferMode,
  formatMemberTransferStatus,
  formatMemberTransferTimestamp,
} from '../../lib/member-transfers'

/**
 * 当前会员转让页。
 * 展示我的转让记录，并支持按转让码接收待接收转让。
 */
export default function TransfersPage() {
  const [records, setRecords] = useState<ListMemberTransfersResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [collectionNo, setCollectionNo] = useState('')
  const [transferMode, setTransferMode] =
    useState<CreateMemberTransferRequest['transferMode']>('DIRECT_MEMBER')
  const [toMemberNo, setToMemberNo] = useState('')
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false)
  const [transferCode, setTransferCode] = useState('')
  const [isAcceptingByCode, setIsAcceptingByCode] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function loadTransfers() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await requestMemberApi<
        ListMemberTransfersResponseData,
        ListMemberTransfersQuery
      >({
        path: '/member-api/my/transfers',
        method: 'GET',
        data: {
          page: 1,
          pageSize: 20,
          direction: 'all',
        } satisfies ListMemberTransfersQuery,
      })
      setRecords(result)
    } catch (error) {
      setErrorMessage(
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : error instanceof Error
            ? error.message
            : '加载转让记录失败，请稍后重试'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTransfers()
  }, [])

  useLoad((options) => {
    if (typeof options.collectionId === 'string') {
      setCollectionId(options.collectionId.trim())
    }
    if (typeof options.collectionNo === 'string') {
      setCollectionNo(options.collectionNo.trim())
    }
  })

  useDidShow(() => {
    void loadTransfers()
  })

  usePullDownRefresh(() => {
    void loadTransfers().finally(() => {
      void Taro.stopPullDownRefresh()
    })
  })

  async function handleAcceptByCode() {
    const code = transferCode.trim()
    if (!code) {
      Taro.showToast({ title: '请先输入转让码', icon: 'none' })
      return
    }

    setIsAcceptingByCode(true)
    try {
      const result = await requestMemberApi<
        CreateMemberTransferResponseData,
        { transferCode: string }
      >({
        path: '/member-api/my/transfers/accept-by-code',
        method: 'POST',
        data: { transferCode: code },
      })
      setTransferCode('')
      Taro.showToast({
        title: `已接收 ${result.collectionNo}`,
        icon: 'success',
      })
      await loadTransfers()
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : '接收转让失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsAcceptingByCode(false)
    }
  }

  async function handleCancelTransfer(transferId: string, collectionNoLabel: string) {
    setCancellingId(transferId)
    try {
      await requestMemberApi<CancelMemberTransferResponseData, undefined>({
        path: `/member-api/my/transfers/${encodeURIComponent(transferId)}/cancel`,
        method: 'POST',
      })
      Taro.showToast({ title: `已撤销 ${collectionNoLabel}`, icon: 'success' })
      await loadTransfers()
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : '撤销转让失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setCancellingId(null)
    }
  }

  async function handleCreateTransfer() {
    if (!collectionId.trim()) {
      Taro.showToast({ title: '请从藏品页进入并指定待转让藏品', icon: 'none' })
      return
    }

    if (transferMode === 'DIRECT_MEMBER' && !toMemberNo.trim()) {
      Taro.showToast({ title: '请输入目标会员编号', icon: 'none' })
      return
    }

    setIsCreatingTransfer(true)
    try {
      const payload: CreateMemberTransferRequest =
        transferMode === 'DIRECT_MEMBER'
          ? {
              transferMode,
              toMemberNo: toMemberNo.trim(),
            }
          : {
              transferMode,
            }

      const result = await requestMemberApi<
        CreateMemberTransferResponseData,
        CreateMemberTransferRequest
      >({
        path: `/member-api/my/collections/${encodeURIComponent(collectionId)}/transfers`,
        method: 'POST',
        data: payload,
      })

      Taro.showToast({
        title:
          result.transferMode === 'TRANSFER_CODE'
            ? `已生成转让码 ${result.transferCode ?? ''}`
            : `已发起 ${result.collectionNo} 转让`,
        icon: 'success',
      })
      await loadTransfers()
    } catch (error) {
      const message =
        error instanceof MemberApiError
          ? formatMemberApiErrorMessage(error)
          : '发起转让失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setIsCreatingTransfer(false)
    }
  }

  return (
    <PageShell
      title='我的转让'
      description='查看我发起或可接收的转让记录；支持使用转让码接收待接收藏品。下拉可刷新。'
      background='linear-gradient(180deg, #f0fdf4 0%, #f8fafc 35%, #eff6ff 100%)'
      heroBackground='#14532d'
      heroTextColor='#f0fdf4'
      heroDescriptionColor='rgba(240, 253, 244, 0.84)'
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18rpx',
          marginBottom: '24rpx',
          padding: '28rpx',
          borderRadius: '24rpx',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 16rpx 44rpx rgba(20, 83, 45, 0.12)',
        }}
      >
        <Text style={{ fontSize: '30rpx', fontWeight: '700', color: '#0f172a' }}>
          发起转让
        </Text>
        <Text style={{ color: '#475569', lineHeight: '1.8' }}>
          {collectionId
            ? `当前目标藏品：${collectionNo || collectionId}`
            : '可从“我的藏品”进入此页并预填待转让藏品，或仅在此页查看转让记录。'}
        </Text>
        <View style={{ display: 'flex', gap: '12rpx' }}>
          <Button
            type='default'
            onClick={() => setTransferMode('DIRECT_MEMBER')}
            style={{
              flex: 1,
              height: '72rpx',
              lineHeight: '72rpx',
              borderRadius: '999rpx',
              border: transferMode === 'DIRECT_MEMBER' ? 'none' : '2rpx solid #86efac',
              background: transferMode === 'DIRECT_MEMBER' ? '#16a34a' : '#f0fdf4',
              color: transferMode === 'DIRECT_MEMBER' ? '#f0fdf4' : '#166534',
              fontSize: '24rpx',
              fontWeight: '600',
            }}
          >
            指定会员转让
          </Button>
          <Button
            type='default'
            onClick={() => setTransferMode('TRANSFER_CODE')}
            style={{
              flex: 1,
              height: '72rpx',
              lineHeight: '72rpx',
              borderRadius: '999rpx',
              border: transferMode === 'TRANSFER_CODE' ? 'none' : '2rpx solid #86efac',
              background: transferMode === 'TRANSFER_CODE' ? '#16a34a' : '#f0fdf4',
              color: transferMode === 'TRANSFER_CODE' ? '#f0fdf4' : '#166534',
              fontSize: '24rpx',
              fontWeight: '600',
            }}
          >
            转让码转让
          </Button>
        </View>
        {transferMode === 'DIRECT_MEMBER' ? (
          <Input
            value={toMemberNo}
            placeholder='输入目标会员编号，例如 MEM-0002'
            onInput={(event) => setToMemberNo(event.detail.value)}
            style={{
              width: '100%',
              height: '84rpx',
              padding: '0 24rpx',
              borderRadius: '18rpx',
              background: '#f8fafc',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <Text style={{ color: '#475569', lineHeight: '1.8' }}>
            生成转让码后，对方可在本页使用转让码接收。
          </Text>
        )}
        <Button
          type='primary'
          loading={isCreatingTransfer}
          disabled={isCreatingTransfer || !collectionId.trim()}
          onClick={() => void handleCreateTransfer()}
          style={{
            height: '84rpx',
            lineHeight: '84rpx',
            borderRadius: '999rpx',
            border: 'none',
            background: '#15803d',
            color: '#f0fdf4',
            fontSize: '28rpx',
            fontWeight: '600',
          }}
        >
          {isCreatingTransfer ? '发起中...' : '确认发起转让'}
        </Button>
      </View>

      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18rpx',
          marginBottom: '24rpx',
          padding: '28rpx',
          borderRadius: '24rpx',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 16rpx 44rpx rgba(20, 83, 45, 0.12)',
        }}
      >
        <Text style={{ fontSize: '30rpx', fontWeight: '700', color: '#0f172a' }}>
          用转让码接收
        </Text>
        <Input
          value={transferCode}
          placeholder='输入转让码，例如 XFER-ABCD1234'
          onInput={(event) => setTransferCode(event.detail.value)}
          style={{
            width: '100%',
            height: '84rpx',
            padding: '0 24rpx',
            borderRadius: '18rpx',
            background: '#f8fafc',
            boxSizing: 'border-box',
          }}
        />
        <Button
          type='primary'
          loading={isAcceptingByCode}
          disabled={isAcceptingByCode}
          onClick={() => void handleAcceptByCode()}
          style={{
            height: '84rpx',
            lineHeight: '84rpx',
            borderRadius: '999rpx',
            border: 'none',
            background: '#16a34a',
            color: '#f0fdf4',
            fontSize: '28rpx',
            fontWeight: '600',
          }}
        >
          {isAcceptingByCode ? '接收中...' : '通过转让码接收'}
        </Button>
      </View>

      {isLoading ? (
        <StatusCard
          title='正在加载转让记录'
          description='系统正在读取当前会员的转让记录，请稍候。'
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
      ) : !records || records.items.length === 0 ? (
        <StatusCard
          title='还没有转让记录'
          description='你还没有发起或接收到任何转让，发起转让后会在这里持续追踪状态。'
          background='#eff6ff'
          borderColor='#93c5fd'
          titleColor='#1d4ed8'
          descriptionColor='#1e40af'
        />
      ) : (
        <View style={{ display: 'flex', flexDirection: 'column', gap: '20rpx' }}>
          {records.items.map((item) => (
            <View
              key={item.transferId}
              style={{
                padding: '28rpx',
                borderRadius: '24rpx',
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 16rpx 44rpx rgba(148, 163, 184, 0.16)',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  marginBottom: '8rpx',
                  fontSize: '30rpx',
                  fontWeight: '700',
                  color: '#0f172a',
                }}
              >
                {item.collectionNo}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                转让单号：{item.transferNo}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                视角：{item.direction === 'outgoing' ? '我发起的' : '我可接收的'}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                方式：{formatMemberTransferMode(item.transferMode)}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                状态：{formatMemberTransferStatus(item.status)}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                对方：{item.counterpartNickname ?? item.counterpartMemberNo ?? '待接收'}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#334155' }}>
                转让码：{item.transferCode ?? '—'}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#64748b' }}>
                发起时间：{formatMemberTransferTimestamp(item.createdAt)}
              </Text>
              <Text style={{ display: 'block', marginBottom: '6rpx', color: '#64748b' }}>
                失效时间：{formatMemberTransferTimestamp(item.expiredAt)}
              </Text>
              <Text style={{ display: 'block', color: '#64748b' }}>
                完成时间：{formatMemberTransferTimestamp(item.completedAt)}
              </Text>
              {item.direction === 'outgoing' && item.status === 'PENDING_ACCEPT' ? (
                <Button
                  type='default'
                  loading={cancellingId === item.transferId}
                  disabled={cancellingId !== null}
                  onClick={() =>
                    void handleCancelTransfer(item.transferId, item.collectionNo)
                  }
                  style={{
                    marginTop: '16rpx',
                    height: '64rpx',
                    lineHeight: '64rpx',
                    borderRadius: '999rpx',
                    border: '2rpx solid #f87171',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: '24rpx',
                    fontWeight: '600',
                  }}
                >
                  {cancellingId === item.transferId ? '撤销中...' : '撤销转让'}
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </PageShell>
  )
}
