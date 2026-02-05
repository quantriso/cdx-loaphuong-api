import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { GlobalExceptionFilter } from '../../../../src/libs/shared/http/filters/global-exception.filter';

describe.skip('CommentModule (Integration) - Story 6.3: Like/Dislike Comment', () => {
  let app: INestApplication;
  let createdCommentId: string;
  let createdContentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Apply same global pipes/filters as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Add middleware to mock user context
    app.use((req: any, res: any, next: any) => {
      req.user = {
        id: 'mock-user-id',
        tenantId: 'mock-tenant-id',
        isAdmin: false,
      };
      next();
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60000); // 60s timeout for app initialization

  afterAll(async () => {
    await app.close();
  }, 30000); // 30s timeout for cleanup

  // Helper to create a comment for testing
  async function createTestComment() {
    const createContentDto = {
      title: `Test Content ${Date.now()}`,
      content: 'Test content for comment voting',
      type: 'ARTICLE',
    };

    const contentResponse = await request(app.getHttpServer())
      .post('/api/v1/contents')
      .send(createContentDto)
      .expect(201);

    createdContentId = contentResponse.body.id;

    // Publish the content so comments can be added
    await request(app.getHttpServer())
      .patch(`/api/v1/contents/${createdContentId}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const createCommentDto = {
      contentId: createdContentId,
      content: 'Test comment for voting',
    };

    const commentResponse = await request(app.getHttpServer())
      .post('/api/v1/comments')
      .send(createCommentDto)
      .expect(201);

    createdCommentId = commentResponse.body.id;
  }

  beforeEach(async () => {
    // Create a fresh comment for each test
    await createTestComment();
  });

  describe('POST /api/v1/comments/:id/vote', () => {
    it('should successfully like a comment', async () => {
      const voteDto = {
        voteType: 'LIKE',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send(voteDto)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Vote recorded successfully',
      );
      expect(response.body).toHaveProperty('likeCount', 1);
      expect(response.body).toHaveProperty('dislikeCount', 0);
    });

    it('should successfully dislike a comment', async () => {
      const voteDto = {
        voteType: 'DISLIKE',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send(voteDto)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Vote recorded successfully',
      );
      expect(response.body).toHaveProperty('likeCount', 0);
      expect(response.body).toHaveProperty('dislikeCount', 1);
    });

    it('should change vote type when user votes with different type', async () => {
      // First vote - like
      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'LIKE' })
        .expect(200);

      // Verify initial state
      let response = await request(app.getHttpServer())
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(200);
      expect(response.body.likeCount).toBe(1);
      expect(response.body.dislikeCount).toBe(0);

      // Change to dislike
      response = await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'DISLIKE' })
        .expect(200);

      expect(response.body).toHaveProperty('likeCount', 0);
      expect(response.body).toHaveProperty('dislikeCount', 1);
    });

    it('should return 400 for invalid vote type', async () => {
      const invalidDto = {
        voteType: 'INVALID_TYPE',
      };

      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send(invalidDto)
        .expect(400);
    });

    it('should return 404 for non-existent comment', async () => {
      const voteDto = {
        voteType: 'LIKE',
      };

      await request(app.getHttpServer())
        .post('/api/v1/comments/non-existent-id/vote')
        .send(voteDto)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/comments/:id/vote', () => {
    it('should successfully remove a like vote', async () => {
      // First create a vote
      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'LIKE' })
        .expect(200);

      // Remove the vote
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/comments/${createdCommentId}/vote`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Vote removed successfully',
      );
      expect(response.body).toHaveProperty('likeCount', 0);
      expect(response.body).toHaveProperty('dislikeCount', 0);
    });

    it('should successfully remove a dislike vote', async () => {
      // First create a vote
      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'DISLIKE' })
        .expect(200);

      // Remove the vote
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/comments/${createdCommentId}/vote`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Vote removed successfully',
      );
      expect(response.body).toHaveProperty('likeCount', 0);
      expect(response.body).toHaveProperty('dislikeCount', 0);
    });

    it('should return 404 when trying to remove non-existent vote', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/comments/${createdCommentId}/vote`)
        .expect(404);
    });

    it('should return 404 for non-existent comment', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/comments/non-existent-id/vote')
        .expect(404);
    });
  });

  describe('GET /api/v1/comments/:id - Vote Counts', () => {
    it('should include vote counts in comment response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('likeCount', 0);
      expect(response.body).toHaveProperty('dislikeCount', 0);
    });

    it('should reflect updated vote counts after voting', async () => {
      // Like the comment
      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'LIKE' })
        .expect(200);

      // Get comment and check counts
      const response = await request(app.getHttpServer())
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('likeCount', 1);
      expect(response.body).toHaveProperty('dislikeCount', 0);
    });

    it('should reflect vote removal in counts', async () => {
      // Like the comment
      await request(app.getHttpServer())
        .post(`/api/v1/comments/${createdCommentId}/vote`)
        .send({ voteType: 'LIKE' })
        .expect(200);

      // Verify count
      let response = await request(app.getHttpServer())
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(200);
      expect(response.body.likeCount).toBe(1);

      // Remove the vote
      await request(app.getHttpServer())
        .delete(`/api/v1/comments/${createdCommentId}/vote`)
        .expect(200);

      // Verify count is back to zero
      response = await request(app.getHttpServer())
        .get(`/api/v1/comments/${createdCommentId}`)
        .expect(200);
      expect(response.body.likeCount).toBe(0);
    });
  });
});
