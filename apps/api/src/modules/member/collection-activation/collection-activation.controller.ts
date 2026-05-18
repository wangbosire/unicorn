import { Body, Controller, Headers, Post } from '@nestjs/common';
import type { ActivateCollectionRequest } from '@contracts/member/collection-activation';
import { CollectionActivationService } from './collection-activation.service';

/**
 * 会员激活藏品控制器。
 * 当前挂载在会员接口边界下，对应 `member-api/collection-activation`。
 */
@Controller('member-api/collection-activation')
export class CollectionActivationController {
  constructor(
    private readonly collectionActivationService: CollectionActivationService,
  ) {}

  /**
   * 输入激活码并领取藏品。
   * 当前要求携带首页登录后拿到的 Bearer access token。
   */
  @Post()
  async activateCollection(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: ActivateCollectionRequest,
  ) {
    return this.collectionActivationService.activateCollection(
      {
        authorization,
      },
      body,
    );
  }
}
