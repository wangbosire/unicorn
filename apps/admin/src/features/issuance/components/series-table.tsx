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
import type { SeriesListItem } from '@contracts/admin/series'
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
import { createSeriesColumns } from './series-columns'

type SeriesTableProps = {
  data: SeriesListItem[]
  /** 列表行内写操作进行中时为 true，避免重复触发。 */
  actionsDisabled: boolean
  onEditSeries: (row: SeriesListItem) => void
  onSetSeriesStatus: (row: SeriesListItem, status: 'ENABLED' | 'DISABLED') => void
  toolbarActions?: ReactNode
  /** 接口 total，用于底部分页旁「共 N 条」。 */
  totalCount?: number
  /** 表格上方列表标题与说明（可多段）；不传则不展示。 */
  listIntro?: DataListIntroBlock | DataListIntroBlock[]
}

export function SeriesTable({
  data,
  actionsDisabled,
  onEditSeries,
  onSetSeriesStatus,
  toolbarActions,
  totalCount,
  listIntro,
}: SeriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<
    Array<{ id: string; value: unknown }>
  >([])

  const columns = useMemo(
    () =>
      createSeriesColumns({
        actionsDisabled,
        onEdit: onEditSeries,
        onSetStatus: onSetSeriesStatus,
      }),
    [actionsDisabled, onEditSeries, onSetSeriesStatus]
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
      const name = String(row.getValue('name')).toLowerCase()
      const seriesNo = String(row.getValue('seriesNo')).toLowerCase()
      const description = String(row.getValue('description')).toLowerCase()

      return (
        name.includes(keyword) ||
        seriesNo.includes(keyword) ||
        description.includes(keyword)
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
        searchPlaceholder='搜索系列名称、编号或描述...'
        actions={toolbarActions}
        filters={[
          {
            columnId: 'status',
            title: '状态',
            options: [
              { label: '启用', value: 'ENABLED' },
              { label: '停用', value: 'DISABLED' },
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
                  暂无符合条件的系列。
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
