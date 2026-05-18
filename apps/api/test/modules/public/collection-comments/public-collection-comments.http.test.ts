import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { PublicCollectionCommentsController } from '../../../../src/modules/public/collection-comments/public-collection-comments.controller';
import { PublicCollectionCommentsService } from '../../../../src/modules/public/collection-comments/public-collection-comments.service';

test('GET /public-api/collections/:slug/comments returns wrapped payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicCollectionCommentsController],
    providers: [
      {
        provide: PublicCollectionCommentsService,
        useValue: {
          listPublicCollectionCommentsBySlug: async () => ({
            collectionNo: 'COL-001',
            slug: 'COL-001',
            topLevelCommentCount: 1,
            totalCommentCount: 2,
            items: [
              {
                commentId: 'cmt_1',
                memberNickname: '评论者A',
                memberAvatarUrl: 'https://example.com/a.png',
                content: '一级评论',
                publishedAt: '2026-05-18T10:00:00.000Z',
                replyCount: 1,
                replies: [
                  {
                    commentId: 'cmt_2',
                    rootCommentId: 'cmt_1',
                    memberNickname: '评论者B',
                    memberAvatarUrl: null,
                    content: '二级回复',
                    publishedAt: '2026-05-18T10:05:00.000Z',
                  },
                ],
              },
            ],
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
      .get('/public-api/collections/COL-001/comments')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.items[0]?.commentId, 'cmt_1');
    assert.equal(response.body.data.totalCommentCount, 2);
    assert.equal(response.body.data.items[0]?.replyCount, 1);
  } finally {
    await app.close();
  }
});
