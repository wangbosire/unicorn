import { useMemo, useState, type ReactNode } from 'react'
import {
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { AdminMemberListItem } from '@contracts/admin/members'
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
import { createMembersColumns } from './members-columns'

function resolvePaginationUpdater(
  updater: PaginationState | ((old: PaginationState) => PaginationState),
  old: PaginationState
): PaginationState {
  return typeof updater === 'function' ? updater(old) : updater
}

type MembersTableProps = {
  data: AdminMemberListItem[]
  /** 接口返回的总条数（服务端分页）。 */
  total: number
  /** 当前页码（从 1 开始），与接口 `page` 一致。 */
  page: number
  pageSize: number
  onPaginationModelChange: (model: PaginationState) => void
  /** 搜索框展示与提交给接口的关键词（由父组件做防抖）。 */
  globalFilter: string
  onGlobalFilterChange: OnChangeFn<string>
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>
  /** 列表行内写操作进行中时为 true，避免重复触发。 */
  actionsDisabled: boolean
  onRequestFreeze: (row: AdminMemberListItem) => void
  onRequestUnfreeze: (row: AdminMemberListItem) => void
  /** 表格上方说明块，与发行区 `SeriesTable` 一致。 */
  listIntro?: DataListIntroBlock | DataListIntroBlock[]
  toolbarActions?: ReactNode
}

/**
 * 会员列表表格：复用 data-table 工具条与分页，底层为服务端分页 / 筛选。
 */
export function MembersTable({
  data,
  total,
  page,
  pageSize,
  onPaginationModelChange,
  globalFilter,
  onGlobalFilterChange,
  columnFilters,
  onColumnFiltersChange,
  actionsDisabled,
  onRequestFreeze,
  onRequestUnfreeze,
  listIntro,
  toolbarActions,
}: MembersTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})

  const columns = useMemo(
    () =>
      createMembersColumns({
        actionsDisabled,
        onRequestFreeze,
        onRequestUnfreeze,
      }),
    [actionsDisabled, onRequestFreeze, onRequestUnfreeze]
  )

  const paginationState: PaginationState = useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualFiltering: true,
    pageCount,
    rowCount: total,
    enableSorting: false,
    state: {
      pagination: paginationState,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onPaginationChange: (updater) => {
      const next = resolvePaginationUpdater(updater, paginationState)
      onPaginationModelChange(next)
    },
    onGlobalFilterChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  })

  const introBlocks =
    listIntro == null ? null : Array.isArray(listIntro) ? listIntro : [listIntro]

  return (
    <div className={cn('flex flex-1 flex-col gap-4')}>
      {introBlocks != null && introBlocks.length > 0 ? (
        <DataListIntro blocks={introBlocks} />
      ) : null}
      <DataTableToolbar
        table={table}
        searchPlaceholder='搜索会员编号或昵称…'
        filters={[
          {
            columnId: 'status',
            title: '状态',
            options: [
              { label: '正常', value: 'ACTIVE' },
              { label: '冻结', value: 'FROZEN' },
            ],
          },
        ]}
        actions={toolbarActions}
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
                  暂无符合条件的会员。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        className='mt-auto'
        totalCount={total}
      />
    </div>
  )
}
