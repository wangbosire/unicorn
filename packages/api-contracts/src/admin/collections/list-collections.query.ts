import type { PaginationQuery } from '../../common'

export type ListCollectionsQuery = PaginationQuery & {
  seriesId?: string
  batchId?: string
  status?: string
  ownerMemberId?: string
}
