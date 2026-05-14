import { type Dispatch, type SetStateAction } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
  IssuanceBatchMutationResponseData,
  UpdateIssuanceBatchRequest,
} from '@contracts/admin/issuance-batches'
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

type EditBatchMutationVariables = {
  batchId: string
  payload: UpdateIssuanceBatchRequest
}

type EditBatchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 详情拉取中，表单暂不提交。 */
  isDetailLoading: boolean
  batchNo: string
  seriesName: string
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
  /** 计划发行数量下限（通常为已生成激活码数），与后端 `ISSUANCE_BATCH_QUANTITY_BELOW_GENERATED` 对齐。 */
  minPlannedQuantity?: number
  onSubmit: () => void
  mutation: UseMutationResult<
    IssuanceBatchMutationResponseData,
    unknown,
    EditBatchMutationVariables,
    unknown
  >
}

/**
 * 编辑发行批次弹窗。
 * 系列不可在此变更；备注等字段依赖详情接口回填。
 */
export function EditBatchDialog(props: EditBatchDialogProps) {
  const quantityMin =
    props.minPlannedQuantity !== undefined && props.minPlannedQuantity > 0
      ? props.minPlannedQuantity
      : 1

  const canSubmit =
    !props.isDetailLoading &&
    !props.mutation.isPending &&
    props.batchName.trim().length > 0

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑发行批次</DialogTitle>
          <DialogDescription>
            调整批次名称、计划数量、激活有效期与备注；批次编号与所属系列只读展示。
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <label className='text-sm font-medium text-foreground'>批次编号</label>
              <Input readOnly value={props.batchNo} className='bg-muted' />
            </div>
            <div className='grid gap-2'>
              <label className='text-sm font-medium text-foreground'>所属系列</label>
              <Input readOnly value={props.seriesName} className='bg-muted' />
            </div>
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>批次名称</label>
            <Input
              value={props.batchName}
              onChange={(event) => props.onBatchNameChange(event.target.value)}
              placeholder='例如：第一批'
              disabled={props.isDetailLoading}
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>发行数量</label>
            <Input
              type='number'
              min={quantityMin}
              value={props.quantity}
              onChange={(event) => props.onQuantityChange(event.target.value)}
              placeholder='100'
              disabled={props.isDetailLoading}
            />
            {props.minPlannedQuantity !== undefined && props.minPlannedQuantity > 0 ? (
              <p className='text-xs text-muted-foreground'>
                已生成 {props.minPlannedQuantity} 个激活码，计划数量不得低于该值。
              </p>
            ) : null}
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
                disabled={props.isDetailLoading}
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
                disabled={props.isDetailLoading}
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <label className='text-sm font-medium text-foreground'>运营备注</label>
            <Input
              value={props.remark}
              onChange={(event) => props.onRemarkChange(event.target.value)}
              placeholder='例如：线下活动首发'
              disabled={props.isDetailLoading}
            />
          </div>

          {props.isDetailLoading ? (
            <p className='text-sm text-muted-foreground'>正在加载批次详情...</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => props.onOpenChange(false)}
            disabled={props.mutation.isPending}
          >
            取消
          </Button>
          <Button onClick={props.onSubmit} disabled={!canSubmit}>
            {props.mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
