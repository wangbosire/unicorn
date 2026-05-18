import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  CreateIssuanceBatchRequest,
  CreateIssuanceBatchResponseData,
} from '@contracts/admin/issuance-batches'
import type { SeriesListItem } from '@contracts/admin/series'
import { CreateBatchDialog } from '@/features/issuance/components/create-batch-dialog'

type CreateBatchMutation = UseMutationResult<
  CreateIssuanceBatchResponseData,
  unknown,
  CreateIssuanceBatchRequest,
  unknown
>

function createMutationMock(overrides: Partial<CreateBatchMutation> = {}): CreateBatchMutation {
  return {
    isPending: false,
    ...overrides,
  } as CreateBatchMutation
}

const SERIES_OPTIONS: SeriesListItem[] = [
  {
    id: 'ser_1',
    seriesNo: 'SER-001',
    name: '星辉远征',
    description: '首发系列',
    status: 'ENABLED',
    batchCount: 1,
    enabledBatchCount: 1,
    collectionCount: 100,
    createdAt: Date.now(),
  },
]

describe('CreateBatchDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the dialog title and core form fields', async () => {
    const { getByRole, getByPlaceholder } = await render(
      <CreateBatchDialog
        open
        onOpenChange={vi.fn()}
        seriesOptions={SERIES_OPTIONS}
        seriesId='ser_1'
        onSeriesIdChange={vi.fn()}
        batchName=''
        onBatchNameChange={vi.fn()}
        quantity='100'
        onQuantityChange={vi.fn()}
        activateValidFrom='2026-05-14T00:00'
        onActivateValidFromChange={vi.fn()}
        activateValidTo='2026-06-14T23:59'
        onActivateValidToChange={vi.fn()}
        remark=''
        onRemarkChange={vi.fn()}
        onSubmit={vi.fn()}
        mutation={createMutationMock()}
      />
    )

    const title = getByRole('heading', { level: 2, name: /新增发行批次/i })

    await expect.element(title).toBeInTheDocument()
    await expect.element(getByPlaceholder('例如：第一批')).toBeInTheDocument()
    await expect.element(getByPlaceholder('100')).toBeInTheDocument()
    await expect.element(getByPlaceholder('例如：线下活动首发')).toBeInTheDocument()
  })

  it('closes when clicking cancel', async () => {
    const onOpenChange = vi.fn()
    const { getByRole } = await render(
      <CreateBatchDialog
        open
        onOpenChange={onOpenChange}
        seriesOptions={SERIES_OPTIONS}
        seriesId='ser_1'
        onSeriesIdChange={vi.fn()}
        batchName=''
        onBatchNameChange={vi.fn()}
        quantity='100'
        onQuantityChange={vi.fn()}
        activateValidFrom='2026-05-14T00:00'
        onActivateValidFromChange={vi.fn()}
        activateValidTo='2026-06-14T23:59'
        onActivateValidToChange={vi.fn()}
        remark=''
        onRemarkChange={vi.fn()}
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
      <CreateBatchDialog
        open
        onOpenChange={vi.fn()}
        seriesOptions={SERIES_OPTIONS}
        seriesId='ser_1'
        onSeriesIdChange={vi.fn()}
        batchName='第一批'
        onBatchNameChange={vi.fn()}
        quantity='100'
        onQuantityChange={vi.fn()}
        activateValidFrom='2026-05-14T00:00'
        onActivateValidFromChange={vi.fn()}
        activateValidTo='2026-06-14T23:59'
        onActivateValidToChange={vi.fn()}
        remark='线下活动首发'
        onRemarkChange={vi.fn()}
        onSubmit={onSubmit}
        mutation={createMutationMock()}
      />
    )

    await userEvent.click(getByRole('button', { name: /确认创建/i }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
