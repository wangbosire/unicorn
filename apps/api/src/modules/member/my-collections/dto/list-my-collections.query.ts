import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

/**
 * 查询我的藏品列表参数。
 */
export class ListMyCollectionsQueryDto extends PaginationQueryDto {
  /** 按藏品状态筛选。 */
  status?: string;
}
