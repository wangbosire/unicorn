import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

/**
 * 后台系统管理只读模块。
 * 负责后台用户、角色、权限点、权限组与菜单的查询能力。
 */
@Module({
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
