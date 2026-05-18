import type { PaginatedData } from '../../common'

/**
 * 后台评论列表项。
 */
export type AdminCollectionCommentListItem = {
  /** 评论主键。 */
  commentId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 所属系列编号。 */
  seriesNo: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属批次编号。 */
  batchNo: string
  /** 所属批次名称。 */
  batchName: string
  /** 关联内容版本主键。 */
  contentVersionId: string
  /** 关联内容版本号。 */
  contentVersionNo: number
  /** 评论会员主键。 */
  memberId: string
  /** 评论会员编号。 */
  memberNo: string
  /** 评论会员昵称。 */
  memberNickname: string
  /** 父评论主键；一级评论时为 `null`。 */
  parentCommentId: string | null
  /** 根评论主键；一级评论时为 `null`。 */
  rootCommentId: string | null
  /** 是否为一级评论。 */
  isRootComment: boolean
  /** 当前评论下的直接回复数量。 */
  replyCount: number
  /** 评论正文。 */
  content: string
  /** 评论状态。 */
  status: string
  /** 发布时间（毫秒时间戳）；未公开时为 `null`。 */
  publishedAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

export type ListCollectionCommentsResponseData = PaginatedData<AdminCollectionCommentListItem>
