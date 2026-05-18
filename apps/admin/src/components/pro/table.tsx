'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterPlusIcon,
  SlidersHorizontalIcon,
  SearchIcon,
} from 'lucide-react'
import { cn, getPageNumbers } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProCard, type ProCardProps } from './card'

type ProTablePaginationMode = 'client' | 'server'
type ProTableCardVariant = 'card' | 'plain'

export type ProTableFilterOption = {
  /** 选项显示文案。 */
  label: ReactNode
  /** 选项提交值。 */
  value: string
}

export type ProTableFilter = {
  /** 对应 tanstack-table column id。 */
  columnId: string
  /** 筛选器按钮标题。 */
  title: ReactNode
  /** 筛选选项。 */
  options: ProTableFilterOption[]
}

export type ProTableSearch<TData> = {
  /** 搜索框占位文案。 */
  placeholder?: string
  /** 受控搜索值；不传则使用内部状态。 */
  value?: string
  /** 搜索值变化。 */
  onValueChange?: (value: string) => void
  /** 自定义全局搜索函数。 */
  globalFilterFn?: FilterFn<TData>
}

export type ProTablePagination = {
  /** 分页模式；client 使用当前 data 客户端分页，server 只渲染页码控件。 */
  mode?: ProTablePaginationMode
  /** 当前页，从 1 开始。 */
  page?: number
  /** 每页条数。 */
  pageSize?: number
  /** 总条数；server 分页时建议显式传入。 */
  total?: number
  /** 可选 pageSize 列表。 */
  pageSizeOptions?: number[]
  /** 页码切换。 */
  onPageChange?: (page: number) => void
  /** 每页条数切换。 */
  onPageSizeChange?: (pageSize: number) => void
}

export type ProTableProps<TData> = Omit<ProCardProps, 'children'> & {
  /** 表格列定义。 */
  columns: Array<ColumnDef<TData, unknown>>
  /** 表格数据源。 */
  data: TData[]
  /** 工具栏，可放搜索区、批量操作、导出等。 */
  toolbar?: ReactNode
  /** 查询框配置；传入后由 ProTable 内置展示搜索框。 */
  search?: ProTableSearch<TData> | false
  /** 内置筛选器配置。 */
  filters?: ProTableFilter[]
  /** 工具栏右侧主操作。 */
  actions?: ReactNode
  /** 是否展示查询 / 重置按钮。 */
  showSearchActions?: boolean
  /** 查询按钮文案。 */
  searchSubmitText?: ReactNode
  /** 重置按钮文案。 */
  searchResetText?: ReactNode
  /** 查询按钮点击，默认仅保留当前筛选状态。 */
  onSearchSubmit?: () => void
  /** 是否展示列设置入口。 */
  showViewOptions?: boolean
  /** 外壳风格：card 使用 ProCard，plain 用于截图所示的无卡片列表区。 */
  variant?: ProTableCardVariant
  /** 是否加载中。 */
  loading?: boolean
  /** 空态标题。 */
  emptyTitle?: ReactNode
  /** 空态说明。 */
  emptyDescription?: ReactNode
  /** 分页配置；不传时不展示分页。 */
  pagination?: false | ProTablePagination
  /** 自定义行 className。 */
  getRowClassName?: (row: Row<TData>) => string | undefined
  /** 行点击处理。 */
  onRowClick?: (row: Row<TData>) => void
  /** 表格容器 className。 */
  tableWrapperClassName?: string
  /** 表格节点 className。 */
  tableClassName?: string
}

/**
 * 基于 tanstack-table + shadcn table 的轻量 ProTable。
 * 默认只内置排序、空态、加载态和分页壳子，不绑定任何业务搜索协议。
 */
export function ProTable<TData>({
  columns,
  data,
  toolbar,
  search,
  filters = [],
  actions,
  showSearchActions,
  searchSubmitText = '查询',
  searchResetText = '重置',
  onSearchSubmit,
  showViewOptions = true,
  variant = 'card',
  loading = false,
  emptyTitle = '暂无数据',
  emptyDescription = '当前筛选条件下没有可展示的记录。',
  pagination = false,
  getRowClassName,
  onRowClick,
  tableWrapperClassName,
  tableClassName,
  contentClassName,
  ...props
}: ProTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalSearch, setInternalSearch] = useState('')
  const paginationConfig = pagination || undefined
  const [internalPage, setInternalPage] = useState(
    paginationConfig?.page ?? 1
  )
  const [internalPageSize, setInternalPageSize] = useState(
    paginationConfig?.pageSize ?? 10
  )

  useEffect(() => {
    if (!paginationConfig) {
      return
    }

    if (paginationConfig.page != null) {
      setInternalPage(paginationConfig.page)
    }

    if (paginationConfig.pageSize != null) {
      setInternalPageSize(paginationConfig.pageSize)
    }
  }, [paginationConfig])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      globalFilter:
        search && search.value !== undefined ? search.value : internalSearch,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (value) => {
      const nextValue =
        typeof value === 'function'
          ? value(search && search.value !== undefined ? search.value : internalSearch)
          : value
      if (search && search.onValueChange) {
        search.onValueChange(String(nextValue ?? ''))
        return
      }

      setInternalSearch(String(nextValue ?? ''))
    },
    globalFilterFn: search ? search.globalFilterFn : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const sortedRows = table.getRowModel().rows
  const paginationMode = paginationConfig?.mode ?? 'client'
  const pageSizeOptions = paginationConfig?.pageSizeOptions ?? [10, 20, 50, 100]
  const currentPage = Math.max(1, paginationConfig?.page ?? internalPage)
  const currentPageSize = Math.max(1, paginationConfig?.pageSize ?? internalPageSize)
  const totalCount =
    paginationMode === 'server'
      ? Math.max(paginationConfig?.total ?? data.length, 0)
      : sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize))

  const visibleRows = useMemo(() => {
    if (!pagination) {
      return sortedRows
    }

    if (paginationMode === 'server') {
      return sortedRows
    }

    const start = (currentPage - 1) * currentPageSize
    return sortedRows.slice(start, start + currentPageSize)
  }, [currentPage, currentPageSize, pagination, paginationMode, sortedRows])

  const pageNumbers = pagination ? getPageNumbers(currentPage, totalPages) : []

  function updatePage(nextPage: number) {
    const safePage = Math.max(1, Math.min(nextPage, totalPages))
    paginationConfig?.onPageChange?.(safePage)
    if (paginationConfig?.page == null) {
      setInternalPage(safePage)
    }
  }

  function updatePageSize(nextPageSize: number) {
    paginationConfig?.onPageSizeChange?.(nextPageSize)
    if (paginationConfig?.pageSize == null) {
      setInternalPageSize(nextPageSize)
    }

    if (paginationConfig?.page == null) {
      setInternalPage(1)
    } else {
      paginationConfig?.onPageChange?.(1)
    }
  }

  function resetFilters() {
    table.resetColumnFilters()
    if (search && search.onValueChange) {
      search.onValueChange('')
    } else {
      setInternalSearch('')
    }
  }

  const shouldShowSearchActions =
    showSearchActions ?? Boolean(search || filters.length > 0)

  const tableContent = (
    <>
      {toolbar ? <div className='pb-3'>{toolbar}</div> : null}

      {search || filters.length > 0 || actions || showViewOptions ? (
        <div className='flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
            {search ? (
              <div className='relative w-full sm:w-80'>
                <SearchIcon className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={
                    search.value !== undefined ? search.value : internalSearch
                  }
                  onChange={(event) => {
                    table.setGlobalFilter(event.target.value)
                  }}
                  placeholder={search.placeholder ?? 'Search'}
                  className='h-10 rounded-lg pl-9 text-sm'
                />
              </div>
            ) : null}

            {filters.map((filter) => {
              const column = table.getColumn(filter.columnId)
              const selectedValues = new Set(
                (column?.getFilterValue() as string[] | undefined) ?? []
              )

              if (!column) {
                return null
              }

              return (
                <DropdownMenu key={filter.columnId}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-10 border-dashed bg-background'
                    >
                      <ListFilterPlusIcon className='size-4' />
                      {filter.title}
                      {selectedValues.size > 0 ? (
                        <span className='rounded-full bg-muted px-1.5 text-xs text-muted-foreground'>
                          {selectedValues.size}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start' className='w-44'>
                    {filter.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selectedValues.has(option.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectedValues.add(option.value)
                          } else {
                            selectedValues.delete(option.value)
                          }
                          const values = Array.from(selectedValues)
                          column.setFilterValue(values.length ? values : undefined)
                        }}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            })}

            {shouldShowSearchActions ? (
              <Button
                type='button'
                variant='ghost'
                className='h-10 px-4 text-lg font-medium text-destructive hover:text-destructive'
                onClick={onSearchSubmit}
              >
                {searchSubmitText}
              </Button>
            ) : null}

            {shouldShowSearchActions ? (
              <Button
                type='button'
                variant='ghost'
                className='h-10 px-4 text-lg font-medium text-destructive hover:text-destructive'
                onClick={resetFilters}
              >
                {searchResetText}
              </Button>
            ) : null}
          </div>

          <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
            {actions}
            {showViewOptions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' variant='outline' className='h-10'>
                    <SlidersHorizontalIcon className='size-4' />
                    列设置
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  <DropdownMenuLabel>显示列</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn('overflow-hidden rounded-xl border', tableWrapperClassName)}>
        <Table className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'h-12 bg-background text-sm font-semibold text-foreground',
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)} className='h-40'>
                  <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
                    <Spinner className='size-4' />
                    <span>正在加载表格数据...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick ? 'cursor-pointer' : undefined,
                    getRowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'h-14 text-sm',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)} className='py-8'>
                  <Empty className='border-0 p-2'>
                    <EmptyHeader>
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                      <EmptyDescription>{emptyDescription}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent />
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <div className='flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-wrap items-center gap-3 text-sm font-medium text-foreground'>
            <div className='flex items-center gap-2'>
              <Select
                value={String(currentPageSize)}
                onValueChange={(value) => updatePageSize(Number(value))}
              >
                <SelectTrigger className='h-10 w-20'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>每页</span>
              <span className='text-muted-foreground'>共 {totalCount} 条</span>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <span className='mr-4 text-sm font-semibold text-foreground'>
              第 {currentPage} / {totalPages} 页
            </span>
            <Button
              type='button'
              variant='outline'
              size='icon'
              disabled={currentPage <= 1}
              className='size-10'
              onClick={() => updatePage(1)}
            >
              <ChevronsLeftIcon className='size-4' />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              disabled={currentPage <= 1}
              className='size-10'
              onClick={() => updatePage(currentPage - 1)}
            >
              <ChevronLeftIcon className='size-4' />
            </Button>

            <div className='flex flex-wrap items-center gap-1'>
              {pageNumbers.map((pageNumber, index) =>
                pageNumber === '...' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className='px-2 text-sm text-muted-foreground'
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={`page-${pageNumber}`}
                    type='button'
                    variant={currentPage === pageNumber ? 'default' : 'outline'}
                    size='icon'
                    className='size-10'
                    onClick={() => updatePage(Number(pageNumber))}
                  >
                    {pageNumber}
                  </Button>
                )
              )}
            </div>

            <Button
              type='button'
              variant='outline'
              size='icon'
              disabled={currentPage >= totalPages}
              className='size-10'
              onClick={() => updatePage(currentPage + 1)}
            >
              <ChevronRightIcon className='size-4' />
            </Button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              disabled={currentPage >= totalPages}
              className='size-10'
              onClick={() => updatePage(totalPages)}
            >
              <ChevronsRightIcon className='size-4' />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )

  if (variant === 'plain') {
    const { title, description, className } = props

    return (
      <section className={cn('space-y-4', className, contentClassName)}>
        {title || description ? (
          <div className='space-y-1.5'>
            {title ? (
              <h2 className='text-2xl font-semibold tracking-normal text-foreground'>
                {title}
              </h2>
            ) : null}
            {description ? (
              <div className='text-sm font-medium text-muted-foreground'>
                {description}
              </div>
            ) : null}
          </div>
        ) : null}
        {tableContent}
      </section>
    )
  }

  return (
    <ProCard
      {...props}
      contentClassName={cn('space-y-4 px-4 py-4 md:px-5', contentClassName)}
    >
      {tableContent}
    </ProCard>
  )
}
