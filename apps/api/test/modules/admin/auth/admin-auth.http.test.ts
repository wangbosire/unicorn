import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { AdminAuthController } from '../../../../src/modules/admin/auth/admin-auth.controller';
import { AdminAuthService } from '../../../../src/modules/admin/auth/admin-auth.service';

test('POST /admin-api/auth/logout returns wrapped success payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminAuthController],
    providers: [
      {
        provide: AdminAuthService,
        useValue: {
          logout: () => ({ success: true }),
        },
      },
    ],
  })
    .overrideGuard(AdminAccessGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/auth/logout')
      .expect(201);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        success: true,
      },
    });
  } finally {
    await app.close();
  }
});

test('GET /admin-api/auth/me returns wrapped hydrated admin payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminAuthController],
    providers: [
      {
        provide: AdminAuthService,
        useValue: {
          buildMeResponseHydrated: async () => ({
            user: {
              id: 'admin_1',
              accountNo: 'ADM-001',
              username: 'root',
              displayName: '超级管理员',
              status: 'ACTIVE',
              lastLoginAt: 1_716_018_800_000,
              roleNames: ['超级管理员'],
              roles: ['super_admin'],
              permissionKeys: ['*'],
              reviewedContentCount: 2,
              reviewedCommentCount: 1,
            },
          }),
        },
      },
    ],
  })
    .overrideGuard(AdminAccessGuard)
    .useValue({
      canActivate: (context: {
        switchToHttp: () => {
          getRequest: () => { admin?: Record<string, unknown> };
        };
      }) => {
        context.switchToHttp().getRequest().admin = {
          id: 'admin_1',
          username: 'root',
          accountNo: 'ADM-001',
          permissionKeys: ['*'],
        };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/auth/me')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.user.accountNo, 'ADM-001');
    assert.equal(response.body.data.user.reviewedContentCount, 2);
  } finally {
    await app.close();
  }
});
