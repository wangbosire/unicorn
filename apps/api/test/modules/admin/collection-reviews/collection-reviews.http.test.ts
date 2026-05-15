import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { BizError } from '../../../../src/common/http/biz-error';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { CollectionReviewsController } from '../../../../src/modules/admin/collection-reviews/collection-reviews.controller';
import { CollectionReviewsService } from '../../../../src/modules/admin/collection-reviews/collection-reviews.service';

type CollectionReviewsHttpServiceMock = Pick<
  CollectionReviewsService,
  'listCollectionReviews' | 'approveCollectionReview' | 'rejectCollectionReview'
> &
  Partial<
    Pick<
      CollectionReviewsService,
      'listCollectionReviewHistory' | 'takedownPublishedContentVersion'
    >
  >;

async function createCollectionReviewsHttpApp(
  mock: CollectionReviewsHttpServiceMock,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionReviewsController],
    providers: [
      {
        provide: CollectionReviewsService,
        useValue: {
          listCollectionReviewHistory: async () => {
            throw new Error('not used');
          },
          takedownPublishedContentVersion: async () => {
            throw new Error('not used');
          },
          ...mock,
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
  return app;
}

test('GET /admin-api/collection-reviews returns wrapped paginated list', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => ({
      items: [
        {
          reviewId: 'crr_1',
          collectionId: 'col_1',
          collectionNo: 'COL-001',
          contentVersionId: 'ccv_1',
          versionNo: 1,
          reviewStage: 'MANUAL',
          reviewStatus: 'PENDING_MANUAL',
          reviewReason: '同步机审策略已通过，待人工复核',
          submittedAt: 1_715_668_800_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-reviews')
      .query({ page: '1', pageSize: '20', reviewStatus: 'PENDING_MANUAL' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.reviewId, 'crr_1');
    assert.equal(response.body.data.items[0]?.reviewStatus, 'PENDING_MANUAL');
    assert.equal(
      response.body.data.items[0]?.reviewReason,
      '同步机审策略已通过，待人工复核',
    );
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collection-reviews/history returns wrapped timeline', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    listCollectionReviewHistory: async () => ({
      items: [
        {
          reviewId: 'crr_a',
          collectionNo: 'COL-001',
          contentVersionId: 'ccv_1',
          versionNo: 1,
          reviewStage: 'MACHINE',
          reviewStatus: 'MACHINE_APPROVED',
          reviewSource: 'SYSTEM',
          reviewReason: null,
          createdAt: 1_000,
          reviewedAt: 2_000,
          reviewedByDisplayName: null,
        },
      ],
    }),
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-reviews/history')
      .query({ collectionNo: 'COL-001' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.items.length, 1);
    assert.equal(response.body.data.items[0]?.reviewId, 'crr_a');
    assert.equal(response.body.data.items[0]?.reviewedByDisplayName, null);
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collection-reviews/history returns 400 when collectionNo missing', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    listCollectionReviewHistory: async (query) => {
      if (!(query.collectionNo ?? '').trim()) {
        throw new BizError({
          code: 'VALIDATION_ERROR',
          message: 'collectionNo is required',
        });
      }
      return { items: [] };
    },
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-reviews/history')
      .expect(400);

    assert.equal(response.body.code, 'VALIDATION_ERROR');
    assert.equal(response.body.message, 'collectionNo is required');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collection-reviews returns 400 when reviewStatus is invalid', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async (query) => {
      if (query.reviewStatus === 'NOT_A_VALID_STATUS') {
        throw new BizError({
          code: 'INVALID_COLLECTION_REVIEW_STATUS',
          message: 'invalid collection review status',
        });
      }
      return { items: [], page: 1, pageSize: 20, total: 0 };
    },
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-reviews')
      .query({ page: '1', pageSize: '20', reviewStatus: 'NOT_A_VALID_STATUS' })
      .expect(400);

    assert.equal(response.body.code, 'INVALID_COLLECTION_REVIEW_STATUS');
    assert.equal(response.body.message, 'invalid collection review status');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-reviews/:reviewId/approve returns wrapped approval payload', async () => {
  const reviewedAt = new Date('2026-05-15T10:00:00.000Z').getTime();
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    approveCollectionReview: async (reviewId, body) => {
      assert.equal(reviewId, 'crr_1');
      assert.equal(body.comment, '人工备注');
      return {
        reviewId: 'crr_1',
        reviewStatus: 'MANUAL_APPROVED',
        publishStatus: 'PUBLISHED',
        reviewedAt,
      };
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-reviews/crr_1/approve')
      .send({ comment: '人工备注' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      reviewId: 'crr_1',
      reviewStatus: 'MANUAL_APPROVED',
      publishStatus: 'PUBLISHED',
      reviewedAt,
    });
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-reviews/:reviewId/reject returns wrapped rejection payload', async () => {
  const reviewedAt = new Date('2026-05-15T11:00:00.000Z').getTime();
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async (reviewId, body) => {
      assert.equal(reviewId, 'crr_2');
      assert.equal(body.reason, '不符合规范');
      return {
        reviewId: 'crr_2',
        reviewStatus: 'MANUAL_REJECTED',
        publishStatus: 'UNPUBLISHED',
        reviewedAt,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-reviews/crr_2/reject')
      .send({ reason: '不符合规范' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      reviewId: 'crr_2',
      reviewStatus: 'MANUAL_REJECTED',
      publishStatus: 'UNPUBLISHED',
      reviewedAt,
    });
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-reviews/:reviewId/approve returns BizError when service rejects', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    approveCollectionReview: async () => {
      throw new BizError({
        code: 'REVIEW_STATUS_INVALID',
        message: 'review status invalid',
      });
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-reviews/crr_1/approve')
      .send({})
      .expect(400);

    assert.equal(response.body.code, 'REVIEW_STATUS_INVALID');
    assert.equal(response.body.message, 'review status invalid');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-reviews/:reviewId/reject returns 404 when review missing', async () => {
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new BizError({
        code: 'REVIEW_RECORD_NOT_FOUND',
        message: 'review record not found',
        status: 404,
      });
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-reviews/missing/reject')
      .send({ reason: 'x' })
      .expect(404);

    assert.equal(response.body.code, 'REVIEW_RECORD_NOT_FOUND');
    assert.equal(response.body.message, 'review record not found');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-reviews/content-versions/:id/takedown returns wrapped payload', async () => {
  const appliedAt = new Date('2026-05-15T12:00:00.000Z').getTime();
  const app = await createCollectionReviewsHttpApp({
    listCollectionReviews: async () => {
      throw new Error('not used');
    },
    approveCollectionReview: async () => {
      throw new Error('not used');
    },
    rejectCollectionReview: async () => {
      throw new Error('not used');
    },
    takedownPublishedContentVersion: async (contentVersionId, body) => {
      assert.equal(contentVersionId, 'ccv_pub_1');
      assert.equal(body.reason, '风控下架');
      return {
        contentVersionId: 'ccv_pub_1',
        collectionNo: 'COL-001',
        publishStatus: 'TAKEDOWN',
        appliedAt,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-reviews/content-versions/ccv_pub_1/takedown')
      .send({ reason: '风控下架' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      contentVersionId: 'ccv_pub_1',
      collectionNo: 'COL-001',
      publishStatus: 'TAKEDOWN',
      appliedAt,
    });
  } finally {
    await app.close();
  }
});
