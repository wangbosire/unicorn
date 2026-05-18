import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { DashboardController } from '../../../../src/modules/admin/dashboard/dashboard.controller';
import { DashboardService } from '../../../../src/modules/admin/dashboard/dashboard.service';

async function createDashboardHttpApp(
  mock: Pick<DashboardService, 'getDashboardOverview'>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DashboardController],
    providers: [
      {
        provide: DashboardService,
        useValue: mock,
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
  return app;
}

test('GET /admin-api/dashboard/overview returns wrapped metrics payload', async () => {
  const app = await createDashboardHttpApp({
    getDashboardOverview: async () => ({
      activationCodesTotal: 12,
      usedActivationCodesTotal: 5,
      claimedCollectionsTotal: 8,
      pendingClaimCollectionsTotal: 4,
      frozenCollectionsTotal: 1,
      pendingManualCollectionReviewsTotal: 3,
      publishedContentVersionsTotal: 6,
      pendingManualCommentsTotal: 2,
      membersTotal: 20,
      generatedAt: 1_716_130_000_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/dashboard/overview')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      activationCodesTotal: 12,
      usedActivationCodesTotal: 5,
      claimedCollectionsTotal: 8,
      pendingClaimCollectionsTotal: 4,
      frozenCollectionsTotal: 1,
      pendingManualCollectionReviewsTotal: 3,
      publishedContentVersionsTotal: 6,
      pendingManualCommentsTotal: 2,
      membersTotal: 20,
      generatedAt: 1_716_130_000_000,
    });
  } finally {
    await app.close();
  }
});
