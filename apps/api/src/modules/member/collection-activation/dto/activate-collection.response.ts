/**
 * 会员激活藏品返回结构。
 */
export type ActivateCollectionResponseDataDto = {
  /** 激活后归属到当前会员的藏品信息。 */
  collection: {
    /** 藏品主键。 */
    id: string;
    /** 对外展示的藏品编号。 */
    collectionNo: string;
    /** 激活后的藏品状态。 */
    status: string;
    /** 实际领取时间。 */
    claimedAt: number;
  };
};
