import type { PaginationQuery } from '../../common'

export type ListActivationCodesQuery = PaginationQuery & {
  batchId?: string
  status?: string
  keyword?: string
}
