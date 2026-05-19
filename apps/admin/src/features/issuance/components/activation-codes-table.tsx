import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ActivationCodeListItem } from '@contracts/admin/activation-codes'
import { cn } from '@/lib/utils'
import {
  DataListIntro,
  type DataListIntroBlock,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createActivationCodesColumns } from './activation-codes-columns'

type ActivationCodesTableProps = {
  data: ActivationCodeListItem[]
  actionsDisabled: boolean
  canVoidActivationCode: boolean
  onVoidRequest: (row: ActivationCodeListItem) => void
  /** 右侧操作栏：导出、批量生成等。 */
  toolbarActions?: ReactNode
  /** 接口 total，用于底部分页旁「共 N 条」（与当前页行数可不一致）。 */
  totalCount?: number
  /** 表格上方列表标题与说明；不传则不展示。 */
  listIntro?: DataListIntroBlock | DataListIntroBlock[]
}

export function ActivationCodesTable({
  data,
  actionsDisabled,
  canVoidActivationCode,
  onVoidRequest,
  toolbarActions,
  totalCount,
  listIntro,
}: ActivationCodesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<
    Array<{ id: string; value: unknown }>
  >([])

  const columns = useMemo(
    () =>
      createActivationCodesColumns({
        actionsDisabled,
        canVoidActivationCode,
        onVoidRequest,
      }),
    [actionsDisabled, canVoidActivationCode, onVoidRequest]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _columnId, filterValue) => {
      const keyword = String(filterValue).toLowerCase()
      const code = String(row.getValue('code')).toLowerCase()
      const batchName = String(row.getValue('batchName')).toLowerCase()
      const collectionNo = String(row.getValue('collectionNo')).toLowerCase()

      return (
        code.includes(keyword) ||
        batchName.includes(keyword) ||
        collectionNo.includes(keyword)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  useEffect(() => {
    table.setPageIndex(0)
  }, [globalFilter, columnFilters, table])

  const introBlocks =
    listIntro == null ? null : Array.isArray(listIntro) ? listIntro : [listIntro]

  return (
    <div className={cn('flex flex-1 flex-col gap-4')}>
      {introBlocks != null && introBlocks.length > 0 ? (
        <DataListIntro blocks={introBlocks} />
      ) : null}
      <DataTableToolbar
        table={table}
        searchPlaceholder='搜索激活码、批次或藏品编号...'
        actions={toolbarActions}
        filters={[
          {
            columnId: 'status',
            title: '状态',
            options: [
              { label: '未发放', value: 'UNISSUED' },
              { label: '已发放', value: 'ISSUED' },
              { label: '已使用', value: 'USED' },
              { label: '已作废', value: 'VOIDED' },
              { label: '已过期', value: 'EXPIRED' },
            ],
          },
        ]}
      />
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无激活码数据。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        className='mt-auto'
        totalCount={totalCount}
      />
    </div>
  )
}
