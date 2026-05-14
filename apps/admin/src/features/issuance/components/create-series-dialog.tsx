import { type Dispatch, type SetStateAction } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  CreateSeriesRequest,
  CreateSeriesResponseData,
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

type CreateSeriesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesName: string
  onSeriesNameChange: Dispatch<SetStateAction<string>>
  seriesDescription: string
  onSeriesDescriptionChange: Dispatch<SetStateAction<string>>
  onSubmit: () => void
  mutation: UseMutationResult<
    CreateSeriesResponseData,
    unknown,
    CreateSeriesRequest,
    unknown
  >
}

/**
 * 新增系列弹窗。
 * 从页面中拆出发行系列创建表单，保持 feature 入口文件聚焦页面编排。
 */
export function CreateSeriesDialog(props: CreateSeriesDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增系列</DialogTitle>
          <DialogDescription>
            先定义系列名称和描述，后续发行批次会挂载到这个系列之下。
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
            {props.mutation.isPending ? '创建中...' : '确认创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
