import { type Dispatch, type SetStateAction } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  GenerateActivationCodesRequest,
  GenerateActivationCodesResponseData,
} from '@contracts/admin/activation-codes'
import type { IssuanceBatchListItem } from '@contracts/admin/issuance-batches'
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

type GenerateActivationCodesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchOptions: IssuanceBatchListItem[]
  batchId: string
  onBatchIdChange: Dispatch<SetStateAction<string>>
  count: string
  onCountChange: Dispatch<SetStateAction<string>>
  issuedChannel: string
  onIssuedChannelChange: Dispatch<SetStateAction<string>>
  onSubmit: () => void
  mutation: UseMutationResult<
    GenerateActivationCodesResponseData,
    unknown,
    GenerateActivationCodesRequest,
    unknown
  >
}

/**
 * 批量生成激活码弹窗。
 * 聚合批次选择和生成参数输入，保持激活码页面主体聚焦列表展示。
 */
export function GenerateActivationCodesDialog(
  props: GenerateActivationCodesDialogProps
) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量生成激活码</DialogTitle>
          <DialogDescription>
            选择批次后批量生成激活码，系统会同步创建一一对应的待领取藏品。下拉仅展示「系列启用且批次启用」的批次。
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>所属批次</label>
            <Select value={props.batchId} onValueChange={props.onBatchIdChange}>
              <SelectTrigger>
                <SelectValue placeholder='选择系列与批次均已启用的批次' />
              </SelectTrigger>
              <SelectContent>
                {props.batchOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.batchNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>生成数量</label>
            <Input
              type='number'
              min='1'
              value={props.count}
              onChange={(event) => props.onCountChange(event.target.value)}
              placeholder='10'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>发放渠道</label>
            <Input
              value={props.issuedChannel}
              onChange={(event) => props.onIssuedChannelChange(event.target.value)}
              placeholder='例如：offline_event'
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
            disabled={props.mutation.isPending || props.batchOptions.length === 0}
          >
            {props.mutation.isPending ? '生成中...' : '确认生成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
