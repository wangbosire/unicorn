import { type Dispatch, type SetStateAction } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  SeriesMutationResponseData,
  UpdateSeriesRequest,
} from '@contracts/admin/series'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type EditSeriesMutationVariables = {
  seriesId: string
  payload: UpdateSeriesRequest
}

type EditSeriesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesName: string
  onSeriesNameChange: Dispatch<SetStateAction<string>>
  seriesDescription: string
  onSeriesDescriptionChange: Dispatch<SetStateAction<string>>
  onSubmit: () => void
  mutation: UseMutationResult<
    SeriesMutationResponseData,
    unknown,
    EditSeriesMutationVariables,
    unknown
  >
}

/**
 * 编辑系列基础信息弹窗。
 * 与新增弹窗结构一致，便于运营在列表侧就地修订名称与描述。
 */
export function EditSeriesDialog(props: EditSeriesDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑系列</DialogTitle>
          <DialogDescription>
            修改系列名称或描述后，发行批次与激活码侧将展示最新文案。
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>系列名称</label>
            <Input
              value={props.seriesName}
              onChange={(event) => props.onSeriesNameChange(event.target.value)}
              placeholder='例如：星辉远征'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>系列描述</label>
            <Input
              value={props.seriesDescription}
              onChange={(event) =>
                props.onSeriesDescriptionChange(event.target.value)
              }
              placeholder='填写该系列的运营主题和发行定位'
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => props.onOpenChange(false)}
            disabled={props.mutation.isPending}
          >
            取消
          </Button>
          <Button onClick={props.onSubmit} disabled={props.mutation.isPending}>
            {props.mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
