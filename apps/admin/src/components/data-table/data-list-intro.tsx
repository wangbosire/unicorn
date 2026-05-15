import type { ReactNode } from 'react'

/** 表格上方「区块标题 + 可选说明」的单段配置；多段时传数组（如系列总览 + 系列列表）。 */
export type DataListIntroBlock = {
  title: string
  /** 小号次要色说明，可含动态数据。 */
  description?: ReactNode
}

type DataListIntroProps = {
  blocks: DataListIntroBlock[]
}

/**
 * 列表页表格区顶部的标题与说明（非整页大标题）；与 data-table 工具栏、表体配套使用。
 */
export function DataListIntro({ blocks }: DataListIntroProps) {
  if (blocks.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-4'>
      {blocks.map((block, index) => (
        <div key={`${block.title}-${index}`} className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>{block.title}</h2>
          {block.description != null && block.description !== '' ? (
            <div className='text-sm text-muted-foreground'>{block.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
