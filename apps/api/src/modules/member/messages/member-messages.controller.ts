import { Controller, Get, Headers, Param, Patch, Query } from '@nestjs/common';
import type {
  ListMemberMessagesQuery,
  MarkMemberMessageReadParams,
} from '@contracts/member/messages';
import { MemberMessagesService } from './member-messages.service';

/**
 * 当前会员消息中心控制器。
 * 提供消息列表与标记已读能力。
 */
@Controller('member-api/my/messages')
export class MemberMessagesController {
  constructor(private readonly memberMessagesService: MemberMessagesService) {}

  /**
   * 查询当前会员消息列表。
   * 当前要求携带 Bearer access token。
   */
  @Get()
  async listMemberMessages(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListMemberMessagesQuery,
  ) {
    return this.memberMessagesService.listMemberMessages(
      {
        authorization,
      },
      query,
    );
  }

  /**
   * 将当前会员的一条消息标记为已读。
   * 当前要求携带 Bearer access token。
   */
  @Patch(':messageId/read')
  async markMemberMessageRead(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: MarkMemberMessageReadParams,
  ) {
    return this.memberMessagesService.markMemberMessageRead(
      {
        authorization,
      },
      params,
    );
  }
}
