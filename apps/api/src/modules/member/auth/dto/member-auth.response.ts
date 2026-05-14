/**
 * 当前会员基础信息。
 */
export type CurrentMemberDto = {
  /** 会员主键。 */
  id: string;
  /** 对外展示的会员编号。 */
  memberNo: string;
  /** 会员昵称。 */
  nickname: string;
  /** 会员头像地址，为空时返回空字符串便于前端直接渲染。 */
  avatarUrl: string;
  /** 会员状态。 */
  status: string;
};

/**
 * 微信小程序登录返回结构。
 */
export type WechatMiniappLoginResponseDataDto = {
  /** 临时联调 access token。 */
  accessToken: string;
  /** 当前登录会员信息。 */
  member: CurrentMemberDto;
};

/**
 * 获取当前会员返回结构。
 */
export type GetCurrentMemberResponseDataDto = CurrentMemberDto;
