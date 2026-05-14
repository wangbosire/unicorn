import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

/**
 * 查询系列列表参数。
 */
export class ListSeriesQueryDto extends PaginationQueryDto {
  /** 系列名称或系列编号模糊搜索关键字。 */
  keyword?: string;

  /** 系列状态筛选值。 */
  status?: string;
}
