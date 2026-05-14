import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

/**
 * 查询发行批次列表参数。
 */
export class ListIssuanceBatchesQueryDto extends PaginationQueryDto {
  /** 批次名称或批次编号模糊搜索关键字。 */
  keyword?: string;

  /** 系列主键筛选值。 */
  seriesId?: string;

  /** 批次状态筛选值。 */
  status?: string;
}
