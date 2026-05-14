import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { UseMutationResult } from '@tanstack/react-query'
import type { CreateSeriesRequest, CreateSeriesResponseData } from '@contracts/admin/series'
import { CreateSeriesDialog } from '@/features/issuance/components/create-series-dialog'

type CreateSeriesMutation = UseMutationResult<
  CreateSeriesResponseData,
  unknown,
  CreateSeriesRequest,
  unknown
>

function createMutationMock(overrides: Partial<CreateSeriesMutation> = {}): CreateSeriesMutation {
  return {
    isPending: false,
    ...overrides,
  } as CreateSeriesMutation
}

describe('CreateSeriesDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the dialog title, description and form fields', async () => {
    const { getByRole, getByPlaceholder } = await render(
      <CreateSeriesDialog
        open
        onOpenChange={vi.fn()}
        seriesName=''
        onSeriesNameChange={vi.fn()}
        seriesDescription=''
        onSeriesDescriptionChange={vi.fn()}
        onSubmit={vi.fn()}
        mutation={createMutationMock()}
      />
    )

    const title = getByRole('heading', { level: 2, name: /新增系列/i })
    const seriesNameInput = getByPlaceholder('例如：星辉远征')
    const seriesDescriptionInput = getByPlaceholder('填写该系列的运营主题和发行定位')

    await expect.element(title).toBeInTheDocument()
    await expect.element(seriesNameInput).toBeInTheDocument()
    await expect.element(seriesDescriptionInput).toBeInTheDocument()
  })

  it('closes when clicking cancel', async () => {
    const onOpenChange = vi.fn()
    const { getByRole } = await render(
      <CreateSeriesDialog
        open
        onOpenChange={onOpenChange}
        seriesName=''
        onSeriesNameChange={vi.fn()}
        seriesDescription=''
        onSeriesDescriptionChange={vi.fn()}
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
      <CreateSeriesDialog
        open
        onOpenChange={vi.fn()}
        seriesName='星辉远征'
        onSeriesNameChange={vi.fn()}
        seriesDescription='首发系列'
        onSeriesDescriptionChange={vi.fn()}
        onSubmit={onSubmit}
        mutation={createMutationMock()}
      />
    )

    await userEvent.click(getByRole('button', { name: /确认创建/i }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
