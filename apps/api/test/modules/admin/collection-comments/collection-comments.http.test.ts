import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { CollectionCommentsController } from '../../../../src/modules/admin/collection-comments/collection-comments.controller';
import { CollectionCommentsService } from '../../../../src/modules/admin/collection-comments/collection-comments.service';

type CollectionCommentsHttpServiceMock = Pick<
  CollectionCommentsService,
  | 'listCollectionComments'
  | 'listCollectionCommentReviews'
  | 'approveCollectionComment'
  | 'blockCollectionComment'
  | 'rejectCollectionComment'
>;

async function createCollectionCommentsHttpApp(
  mock: Partial<CollectionCommentsHttpServiceMock>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionCommentsController],
    providers: [
      {
        provide: CollectionCommentsService,
        useValue: {
          listCollectionComments: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
          listCollectionCommentReviews: async () => ({
            items: [],
            page: 1,
            pageSize: 20,
            total: 0,
          }),
          approveCollectionComment: async () => {
            throw new Error('not used');
          },
          blockCollectionComment: async () => {
            throw new Error('not used');
          },
          rejectCollectionComment: async () => {
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

test('GET /admin-api/collection-comments returns wrapped list', async () => {
  const app = await createCollectionCommentsHttpApp({
    listCollectionComments: async () => ({
      items: [
        {
          commentId: 'cmt_1',
          collectionNo: 'COL-001',
          seriesNo: 'SER-001',
          seriesName: '星辉远征',
          batchNo: 'BAT-001',
          batchName: '首发批次',
          contentVersionId: 'ccv_1',
          contentVersionNo: 1,
          memberId: 'mem_1',
          memberNo: 'MEM-001',
          memberNickname: '会员甲',
          parentCommentId: null,
          rootCommentId: null,
          isRootComment: true,
          replyCount: 1,
          content: '评论一',
          status: 'PENDING_MANUAL',
          publishedAt: null,
          createdAt: 1_716_025_000_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-comments')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.items[0]?.commentId, 'cmt_1');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collection-comments/reviews returns wrapped queue', async () => {
  const app = await createCollectionCommentsHttpApp({
    listCollectionCommentReviews: async () => ({
      items: [
        {
          commentId: 'cmt_1',
          collectionNo: 'COL-001',
          seriesNo: 'SER-001',
          seriesName: '星辉远征',
          batchNo: 'BAT-001',
          batchName: '首发批次',
          contentVersionId: 'ccv_1',
          contentVersionNo: 1,
          memberNo: 'MEM-001',
          memberNickname: '会员甲',
          parentCommentId: null,
          rootCommentId: null,
          isRootComment: true,
          content: '评论一',
          status: 'PENDING_MANUAL',
          reviewSource: 'SYSTEM',
          reviewReason: '待人工审核',
          createdAt: 1_716_025_000_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collection-comments/reviews')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.items[0]?.commentId, 'cmt_1');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-comments/:commentId/approve returns wrapped payload', async () => {
  const app = await createCollectionCommentsHttpApp({
    approveCollectionComment: async (commentId, body) => {
      assert.equal(commentId, 'cmt_1');
      assert.equal(body.comment, '人工通过');
      return {
        commentId: 'cmt_1',
        status: 'MANUAL_APPROVED',
        reviewedAt: 1_716_026_000_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-comments/cmt_1/approve')
      .send({ comment: '人工通过' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'MANUAL_APPROVED');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-comments/:commentId/reject returns wrapped payload', async () => {
  const app = await createCollectionCommentsHttpApp({
    rejectCollectionComment: async (commentId, body) => {
      assert.equal(commentId, 'cmt_1');
      assert.equal(body.reason, '违规');
      return {
        commentId: 'cmt_1',
        status: 'MANUAL_REJECTED',
        reviewedAt: 1_716_026_500_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-comments/cmt_1/reject')
      .send({ reason: '违规' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'MANUAL_REJECTED');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-comments/:commentId/block returns wrapped payload', async () => {
  const app = await createCollectionCommentsHttpApp({
    blockCollectionComment: async (commentId, body) => {
      assert.equal(commentId, 'cmt_2');
      assert.equal(body.reason, '运营屏蔽');
      return {
        commentId: 'cmt_2',
        status: 'BLOCKED',
        reviewedAt: 1_716_027_000_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-comments/cmt_2/block')
      .send({ reason: '运营屏蔽' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'BLOCKED');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/collection-comments/:commentId/approve propagates BizError', async () => {
  const app = await createCollectionCommentsHttpApp({
    approveCollectionComment: async () => {
      throw new BizError({
        code: 'COMMENT_REVIEW_STATUS_INVALID',
        message: 'comment review status invalid',
      });
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/collection-comments/cmt_2/approve')
      .send({})
      .expect(400);

    assert.equal(response.body.code, 'COMMENT_REVIEW_STATUS_INVALID');
  } finally {
    await app.close();
  }
});
