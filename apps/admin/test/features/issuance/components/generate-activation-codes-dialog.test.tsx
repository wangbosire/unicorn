import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  GenerateActivationCodesRequest,
  GenerateActivationCodesResponseData,
} from '@contracts/admin/activation-codes'
import { GenerateActivationCodesDialog } from '@/features/issuance/components/generate-activation-codes-dialog'

type GenerateActivationCodesMutation = UseMutationResult<
  GenerateActivationCodesResponseData,
  unknown,
  GenerateActivationCodesRequest,
  unknown
>

function createMutationMock(
  overrides: Partial<GenerateActivationCodesMutation> = {}
): GenerateActivationCodesMutation {
  return {
    isPending: false,
    ...overrides,
  } as GenerateActivationCodesMutation
}

const BATCH_OPTIONS = [
  {
    id: 'bat_1',
    batchNo: 'BAT-001',
    seriesId: 'ser_1',
    seriesName: '星辉远征',
    seriesStatus: 'ENABLED',
    name: '第一批',
    quantity: 100,
    generatedCount: 0,
    status: 'ENABLED',
    activateValidFrom: Date.now(),
    activateValidTo: Date.now(),
  },
]

describe('GenerateActivationCodesDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the dialog title and core form fields', async () => {
    const { getByRole, getByPlaceholder } = await render(
      <GenerateActivationCodesDialog
        open
        onOpenChange={vi.fn()}
        batchOptions={BATCH_OPTIONS}
        batchId='bat_1'
        onBatchIdChange={vi.fn()}
        count='10'
        onCountChange={vi.fn()}
        issuedChannel='offline_event'
        onIssuedChannelChange={vi.fn()}
        onSubmit={vi.fn()}
        mutation={createMutationMock()}
      />
    )

    const title = getByRole('heading', {
      level: 2,
      name: /批量生成激活码/i,
    })

    await expect.element(title).toBeInTheDocument()
    await expect.element(getByPlaceholder('10')).toBeInTheDocument()
    await expect.element(getByPlaceholder('例如：offline_event')).toBeInTheDocument()
  })

  it('closes when clicking cancel', async () => {
    const onOpenChange = vi.fn()
    const { getByRole } = await render(
      <GenerateActivationCodesDialog
        open
        onOpenChange={onOpenChange}
        batchOptions={BATCH_OPTIONS}
        batchId='bat_1'
        onBatchIdChange={vi.fn()}
        count='10'
        onCountChange={vi.fn()}
        issuedChannel='offline_event'
        onIssuedChannelChange={vi.fn()}
        onSubmit={vi.fn()}
        mutation={createMutationMock()}
      />
    )

    await userEvent.click(getByRole('button', { name: /取消/i }))

    expect(onOpenChange).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls submit handler when clicking confirm', async () => {
    const onSubmit = vi.fn()
    const { getByRole } = await render(
      <GenerateActivationCodesDialog
        open
        onOpenChange={vi.fn()}
        batchOptions={BATCH_OPTIONS}
        batchId='bat_1'
        onBatchIdChange={vi.fn()}
        count='10'
        onCountChange={vi.fn()}
        issuedChannel='offline_event'
        onIssuedChannelChange={vi.fn()}
        onSubmit={onSubmit}
        mutation={createMutationMock()}
      />
    )

    await userEvent.click(getByRole('button', { name: /确认生成/i }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
