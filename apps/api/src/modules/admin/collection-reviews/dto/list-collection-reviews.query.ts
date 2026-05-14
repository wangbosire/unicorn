import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

/**
 * 查询藏品内容审核队列参数。
 */
export class ListCollectionReviewsQueryDto extends PaginationQueryDto {
  /** 按审核状态筛选。 */
  reviewStatus?: string;

  /** 按系列筛选。 */
  seriesId?: string;

  /** 按批次筛选。 */
  batchId?: string;
}
