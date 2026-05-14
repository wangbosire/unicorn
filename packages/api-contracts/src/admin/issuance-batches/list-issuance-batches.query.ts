import type { PaginationQuery } from '../../common'

export type ListIssuanceBatchesQuery = PaginationQuery & {
  keyword?: string
  seriesId?: string
  status?: string
}
