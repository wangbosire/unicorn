import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

/**
 * 查询激活码列表参数。
 */
export class ListActivationCodesQueryDto extends PaginationQueryDto {
  /** 批次主键筛选值。 */
  batchId?: string;

  /** 激活码状态筛选值。 */
  status?: string;

  /** 激活码或藏品编号模糊搜索关键字。 */
  keyword?: string;
}
