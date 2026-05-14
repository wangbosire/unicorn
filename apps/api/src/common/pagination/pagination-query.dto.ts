/**
 * 通用分页查询参数。
 * Query 参数在控制器层会以字符串形式进入，这里统一声明为可选字符串。
 */
export class PaginationQueryDto {
  /** 页码，从 1 开始。 */
  page?: string;

  /** 每页条数。 */
  pageSize?: string;
}
