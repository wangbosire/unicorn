import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { MemberAuthController } from '../../../../src/modules/member/auth/member-auth.controller';
import { MemberAuthService } from '../../../../src/modules/member/auth/member-auth.service';

test('GET /member-api/auth/me forwards headers and returns wrapped success response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MemberAuthController],
    providers: [
      {
        provide: MemberAuthService,
        useValue: {
          getCurrentMember: async () => ({
            id: 'mem_1',
            memberNo: 'MEM-0001',
            nickname: '测试会员',
            avatarUrl: null,
            mobile: null,
            status: 'ACTIVE',
            registeredAt: 1_715_654_400_000,
            wechatBindingCount: 2,
            ownedCollectionCount: 3,
            commentCount: 4,
          }),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/member-api/auth/me')
      .set('x-member-id', 'mem_1')
      .set('authorization', 'Bearer mock-member-token:mem_1')
      .expect(200);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        id: 'mem_1',
        memberNo: 'MEM-0001',
        nickname: '测试会员',
        avatarUrl: null,
        mobile: null,
        status: 'ACTIVE',
        registeredAt: 1_715_654_400_000,
        wechatBindingCount: 2,
        ownedCollectionCount: 3,
        commentCount: 4,
      },
    });
  } finally {
    await closeApp(app);
  }
});

test('POST /member-api/auth/wechat-mp returns wrapped login response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MemberAuthController],
    providers: [
      {
        provide: MemberAuthService,
        useValue: {
          loginWithWechatMp: async () => ({
            accessToken: 'mock-member-token:mem_2',
            member: {
              id: 'mem_2',
              memberNo: 'MEM-0002',
              nickname: '公众号会员',
              avatarUrl: '',
              mobile: null,
              status: 'ACTIVE',
              registeredAt: 1_715_654_400_000,
              wechatBindingCount: 1,
              ownedCollectionCount: 0,
              commentCount: 0,
            },
          }),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .post('/member-api/auth/wechat-mp')
      .send({ code: 'mp-code' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.member.memberNo, 'MEM-0002');
  } finally {
    await closeApp(app);
  }
});

test('GET /member-api/auth/me returns wrapped auth error response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MemberAuthController],
    providers: [
      {
        provide: MemberAuthService,
        useValue: {
          getCurrentMember: async () => {
            throw new BizError({
              code: 'UNAUTHORIZED',
              message: 'member auth required',
              status: 401,
            });
          },
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/member-api/auth/me')
      .expect(401);

    assert.deepEqual(response.body, {
      code: 'UNAUTHORIZED',
      message: 'member auth required',
    });
  } finally {
    await closeApp(app);
  }
});

async function closeApp(app: INestApplication) {
  await app.close();
}
