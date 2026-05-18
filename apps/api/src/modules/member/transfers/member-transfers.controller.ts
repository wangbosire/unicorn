import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import type {
  AcceptMemberTransferParams,
  AcceptMemberTransferCodeRequest,
  CreateMemberTransferRequest,
  ListMemberTransfersQuery,
} from '@contracts/member/transfers';
import type { GetCollectionContentParams } from '@contracts/member/my-collections';
import { MemberTransfersService } from './member-transfers.service';

/**
 * 当前会员转让控制器。
 * 提供发起转让、接收转让与查询转让记录能力。
 */
@Controller('member-api/my')
export class MemberTransfersController {
  constructor(private readonly memberTransfersService: MemberTransfersService) {}

  /**
   * 查询当前会员的转让记录。
   * 当前要求携带 Bearer access token。
   */
  @Get('transfers')
  async listMemberTransfers(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListMemberTransfersQuery,
  ) {
    return this.memberTransfersService.listMemberTransfers(
      {
        authorization,
      },
      query,
    );
  }

  /**
   * 发起当前会员某件藏品的转让。
   * 当前要求携带 Bearer access token。
   */
  @Post('collections/:collectionId/transfers')
  async createMemberTransfer(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
    @Body() body: CreateMemberTransferRequest,
  ) {
    return this.memberTransfersService.createMemberTransfer(
      {
        authorization,
      },
      params,
      body,
    );
  }

  /**
   * 接收一条指向当前会员或可由当前会员使用转让码接收的转让。
   * 当前要求携带 Bearer access token。
   */
  @Post('transfers/:transferId/accept')
  async acceptMemberTransfer(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: AcceptMemberTransferParams,
  ) {
    return this.memberTransfersService.acceptMemberTransfer(
      {
        authorization,
      },
      params,
    );
  }

  /**
   * 使用转让码接收一条待接收转让。
   * 当前要求携带 Bearer access token。
   */
  @Post('transfers/accept-by-code')
  async acceptMemberTransferByCode(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: AcceptMemberTransferCodeRequest,
  ) {
    return this.memberTransfersService.acceptMemberTransferByCode(
      {
        authorization,
      },
      body,
    );
  }
}
