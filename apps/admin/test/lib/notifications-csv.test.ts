import { describe, expect, it } from 'vitest'
import type {
  AdminNotificationDispatchRecordListItem,
  AdminNotificationFailureSummaryItem,
} from '@contracts/admin/notifications'
import {
  buildNotificationDispatchRecordsCsv,
  buildNotificationFailureSummaryCsv,
} from '@/lib/notifications-csv'

describe('buildNotificationFailureSummaryCsv', () => {
  it('includes header and normalized failure fields', () => {
    const row: AdminNotificationFailureSummaryItem = {
      messageType: 'CONTENT_TAKEDOWN',
      eventLabel: '内容被人工下架',
      channel: 'WECHAT_MP',
      failureCode: 'OPENID_MISSING',
      failureReason: '未绑定 OpenID',
      sampleReason: 'openid not bound',
      failedCount: 3,
      affectedMessages: 2,
      latestFailedAt: 0,
      latestDispatchRecordId: 'dispatch_3',
    }

    const csv = buildNotificationFailureSummaryCsv([row])

    expect(csv.startsWith('事件类型,')).toBe(true)
    expect(csv).toContain('CONTENT_TAKEDOWN')
    expect(csv).toContain('OPENID_MISSING')
    expect(csv).toContain('1970-01-01T00:00:00.000Z')
  })
})

describe('buildNotificationDispatchRecordsCsv', () => {
  it('includes header and escapes rich text fields', () => {
    const row: AdminNotificationDispatchRecordListItem = {
      dispatchRecordId: 'dispatch_1',
      messageId: 'msg_1',
      messageType: 'TRANSFER_PENDING_ACCEPT',
      eventLabel: '转让待接收',
      memberId: 'mem_1',
      title: '转让通知',
      content: '请查看"转让", 并尽快处理',
      channel: 'MINIAPP_SUBSCRIPTION',
      status: 'FAILED',
      failureCode: 'RATE_LIMITED',
      failureReason: '渠道限流',
      providerResponse: 'too many requests',
      sentAt: null,
      createdAt: 0,
    }

    const csv = buildNotificationDispatchRecordsCsv([row])

    expect(csv.startsWith('派发记录ID,')).toBe(true)
    expect(csv).toContain('dispatch_1')
    expect(csv).toContain('"请查看""转让"", 并尽快处理"')
    expect(csv).toContain('too many requests')
    expect(csv).toContain('1970-01-01T00:00:00.000Z')
  })
})
