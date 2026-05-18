import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { CollectionCommentsController } from '../../../../src/modules/member/collection-comments/collection-comments.controller';
import { CollectionCommentsService } from '../../../../src/modules/member/collection-comments/collection-comments.service';

test('POST /member-api/collection-comments returns wrapped payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionCommentsController],
    providers: [
      {
        provide: CollectionCommentsService,
        useValue: {
          createCollectionComment: async () => ({
            commentId: 'cmt_1',
            collectionId: 'col_1',
            collectionNo: 'COL-001',
            contentVersionId: 'ccv_pub_1',
            status: 'MACHINE_APPROVED',
            reviewReason: null,
            publishedAt: 1_716_030_000_000,
            createdAt: 1_716_030_000_000,
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
      .post('/member-api/collection-comments')
      .set('x-member-id', 'mem_1')
      .send({ collectionNo: 'COL-001', content: '评论内容' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.commentId, 'cmt_1');
    assert.equal(response.body.data.collectionNo, 'COL-001');
  } finally {
    await app.close();
  }
});

test('POST /member-api/collection-comments/:commentId/replies returns wrapped payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionCommentsController],
    providers: [
      {
        provide: CollectionCommentsService,
        useValue: {
          replyCollectionComment: async () => ({
            commentId: 'cmt_2',
            collectionId: 'col_1',
            collectionNo: 'COL-001',
            contentVersionId: 'ccv_pub_1',
            parentCommentId: 'cmt_1',
            rootCommentId: 'cmt_1',
            status: 'MACHINE_APPROVED',
            reviewReason: null,
            publishedAt: 1_716_030_100_000,
            createdAt: 1_716_030_100_000,
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
      .post('/member-api/collection-comments/cmt_1/replies')
      .set('x-member-id', 'mem_1')
      .send({ content: '回复内容' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.parentCommentId, 'cmt_1');
    assert.equal(response.body.data.collectionNo, 'COL-001');
  } finally {
    await app.close();
  }
});
