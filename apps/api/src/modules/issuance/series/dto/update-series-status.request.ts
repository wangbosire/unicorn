/**
 * 更新系列状态请求。
 */
export class UpdateSeriesStatusRequestDto {
  /** 目标状态，仅允许 ENABLED 或 DISABLED。 */
  status!: string;
}
