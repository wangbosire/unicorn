import { type Dispatch, type SetStateAction } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  CreateIssuanceBatchRequest,
  CreateIssuanceBatchResponseData,
} from '@contracts/admin/issuance-batches'
import type { SeriesListItem } from '@contracts/admin/series'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CreateBatchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesOptions: SeriesListItem[]
  seriesId: string
  onSeriesIdChange: Dispatch<SetStateAction<string>>
  batchName: string
  onBatchNameChange: Dispatch<SetStateAction<string>>
  quantity: string
  onQuantityChange: Dispatch<SetStateAction<string>>
  activateValidFrom: string
  onActivateValidFromChange: Dispatch<SetStateAction<string>>
  activateValidTo: string
  onActivateValidToChange: Dispatch<SetStateAction<string>>
  remark: string
  onRemarkChange: Dispatch<SetStateAction<string>>
  onSubmit: () => void
  mutation: UseMutationResult<
    CreateIssuanceBatchResponseData,
    unknown,
    CreateIssuanceBatchRequest,
    unknown
  >
}

/**
 * 新增批次弹窗。
 * 聚合批次创建表单输入，保持批次页面主体聚焦列表与交互编排。
 */
export function CreateBatchDialog(props: CreateBatchDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增发行批次</DialogTitle>
          <DialogDescription>
            选择所属系列，并定义本次发行数量和激活有效期，后续即可继续生成激活码。
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>所属系列</label>
            <Select value={props.seriesId} onValueChange={props.onSeriesIdChange}>
              <SelectTrigger>
                <SelectValue placeholder='选择一个已启用系列' />
              </SelectTrigger>
              <SelectContent>
                {props.seriesOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.seriesNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>批次名称</label>
            <Input
              value={props.batchName}
              onChange={(event) => props.onBatchNameChange(event.target.value)}
              placeholder='例如：第一批'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>发行数量</label>
            <Input
              type='number'
              min='1'
              value={props.quantity}
              onChange={(event) => props.onQuantityChange(event.target.value)}
              placeholder='100'
            />
          </div>

          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <label className='text-sm font-medium text-foreground'>
                激活开始时间
              </label>
              <Input
                type='datetime-local'
                value={props.activateValidFrom}
                onChange={(event) =>
                  props.onActivateValidFromChange(event.target.value)
                }
              />
            </div>

            <div className='grid gap-2'>
              <label className='text-sm font-medium text-foreground'>
                激活结束时间
              </label>
              <Input
                type='datetime-local'
                value={props.activateValidTo}
                onChange={(event) => props.onActivateValidToChange(event.target.value)}
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>运营备注</label>
            <Input
              value={props.remark}
              onChange={(event) => props.onRemarkChange(event.target.value)}
              placeholder='例如：线下活动首发'
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
          <Button
            onClick={props.onSubmit}
            disabled={props.mutation.isPending || props.seriesOptions.length === 0}
          >
            {props.mutation.isPending ? '创建中...' : '确认创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
