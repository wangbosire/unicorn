/**
 * 会员激活藏品请求。
 * activationCode 为运营发放的唯一激活凭证，不是藏品编号。
 */
export class ActivateCollectionRequestDto {
  /** 会员输入的激活码。 */
  activationCode!: string;
}
