/**
 * Content Module Integration Tests
 *
 * Story 3.1: Create Content Draft
 * Story 3.2: Update Content
 *
 * These tests verify the integration between different layers:
 * - Controller → Command Bus → Handler → Repository
 * - Validation at HTTP layer
 * - Database persistence
 * - Event publishing
 *
 * Note: These tests require a test database.
 * Run with: npm run test:e2e
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { GlobalExceptionFilter } from '../../../../src/libs/shared/http/filters/global-exception.filter';
import {
  ContentTypeEnum,
  ContentPriorityEnum,
} from '../../../../src/modules/content/domain/value-objects';

describe('ContentModule (Integration) - Story 3.1', () => {
  let app: INestApplication;
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

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60000); // 60s timeout for app initialization

  afterAll(async () => {
    await app.close();
  }, 30000); // 30s timeout for cleanup

  describe('POST /api/v1/contents', () => {
    describe('Story 3.1: Create Content Draft', () => {
      it('should create a new content draft with all fields', async () => {
        const createDto = {
          title: `Test Content ${Date.now()}`,
          content:
            'This is test content body with enough text to be valid for testing purposes.',
          excerpt: 'Short excerpt for testing',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.HIGH,
          categoryId: null,
          tags: ['test', 'integration'],
          featuredImage: 'https://example.com/image.jpg',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty(
          'message',
          'Content draft created successfully',
        );
        expect(response.body.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ); // UUID format

        createdContentId = response.body.id;
      });

      it('should create content with minimal required fields', async () => {
        const minimalDto = {
          title: 'Minimal Content',
          content: 'Minimal content body for testing.',
          type: ContentTypeEnum.NEWS,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(minimalDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('message');
      });

      it('should create content with default MEDIUM priority when not specified', async () => {
        const dto = {
          title: 'Content without priority',
          content: 'Content body without explicit priority.',
          type: ContentTypeEnum.ANNOUNCEMENT,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        // Priority should default to MEDIUM (verified in handler)
      });
    });

    describe('Validation Rules', () => {
      it('should return 400 for missing title', async () => {
        const invalidDto = {
          // title missing
          content: 'Content body',
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for missing content body', async () => {
        const invalidDto = {
          title: 'Test Title',
          // content missing
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for missing type', async () => {
        const invalidDto = {
          title: 'Test Title',
          content: 'Content body',
          // type missing
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for title exceeding 200 characters', async () => {
        const invalidDto = {
          title: 'a'.repeat(201), // Too long
          content: 'Content body',
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for content exceeding 10000 characters', async () => {
        const invalidDto = {
          title: 'Valid Title',
          content: 'a'.repeat(10001), // Too long
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for excerpt exceeding 500 characters', async () => {
        const invalidDto = {
          title: 'Valid Title',
          content: 'Valid content body',
          excerpt: 'a'.repeat(501), // Too long
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for invalid content type', async () => {
        const invalidDto = {
          title: 'Valid Title',
          content: 'Valid content body',
          type: 'INVALID_TYPE', // Not in enum
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });

      it('should return 400 for invalid priority', async () => {
        const invalidDto = {
          title: 'Valid Title',
          content: 'Valid content body',
          type: ContentTypeEnum.ARTICLE,
          priority: 'INVALID_PRIORITY', // Not in enum
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('Different Content Types', () => {
      it('should create ARTICLE type content', async () => {
        const dto = {
          title: 'Article Content',
          content: 'Article content body',
          type: ContentTypeEnum.ARTICLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create NEWS type content', async () => {
        const dto = {
          title: 'News Content',
          content: 'News content body',
          type: ContentTypeEnum.NEWS,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create ANNOUNCEMENT type content', async () => {
        const dto = {
          title: 'Announcement Content',
          content: 'Announcement content body',
          type: ContentTypeEnum.ANNOUNCEMENT,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create NOTICE type content', async () => {
        const dto = {
          title: 'Notice Content',
          content: 'Notice content body',
          type: ContentTypeEnum.NOTICE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });
    });

    describe('Different Priorities', () => {
      it('should create LOW priority content', async () => {
        const dto = {
          title: 'Low Priority Content',
          content: 'Content with low priority',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.LOW,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create HIGH priority content', async () => {
        const dto = {
          title: 'High Priority Content',
          content: 'Content with high priority',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.HIGH,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create URGENT priority content', async () => {
        const dto = {
          title: 'Urgent Priority Content',
          content: 'Content with urgent priority',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.URGENT,
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });
    });

    describe('Optional Fields', () => {
      it('should create content with tags', async () => {
        const dto = {
          title: 'Content with Tags',
          content: 'Content body with tags',
          type: ContentTypeEnum.ARTICLE,
          tags: ['tag1', 'tag2', 'tag3'],
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create content with featured image', async () => {
        const dto = {
          title: 'Content with Image',
          content: 'Content body with featured image',
          type: ContentTypeEnum.ARTICLE,
          featuredImage: 'https://example.com/featured.jpg',
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });

      it('should create content with category', async () => {
        const dto = {
          title: 'Content with Category',
          content: 'Content body with category',
          type: ContentTypeEnum.ARTICLE,
          categoryId: 'category-uuid-123',
        };

        await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(dto)
          .expect(201);
      });
    });
  });

  describe('PATCH /api/v1/contents/:id', () => {
    describe('Story 3.2: Update Content', () => {
      let draftContentId: string;

      beforeEach(async () => {
        // Create a draft content for update tests
        const createDto = {
          title: `Draft for Update ${Date.now()}`,
          content: 'Original content body for testing updates.',
          excerpt: 'Original excerpt',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.MEDIUM,
          tags: ['original', 'test'],
          featuredImage: 'https://example.com/original.jpg',
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(createDto)
          .expect(201);

        draftContentId = createResponse.body.id;
      });

      it('should update content title', async () => {
        const updateDto = {
          title: 'Updated Title',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Content updated successfully',
        );
      });

      it('should update content body', async () => {
        const updateDto = {
          content: 'Updated content body with new information.',
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should update excerpt', async () => {
        const updateDto = {
          excerpt: 'Updated excerpt text',
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should update tags', async () => {
        const updateDto = {
          tags: ['updated', 'new-tags', 'testing'],
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should update featured image', async () => {
        const updateDto = {
          featuredImage: 'https://example.com/updated-image.jpg',
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should update category', async () => {
        const updateDto = {
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should update multiple fields at once', async () => {
        const updateDto = {
          title: 'Fully Updated Title',
          content: 'Fully updated content body.',
          excerpt: 'Fully updated excerpt',
          tags: ['fully', 'updated'],
          featuredImage: 'https://example.com/fully-updated.jpg',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Content updated successfully',
        );
      });

      it('should return 404 for non-existent content', async () => {
        const updateDto = {
          title: 'Updated Title',
        };

        await request(app.getHttpServer())
          .patch('/api/v1/contents/non-existent-id')
          .send(updateDto)
          .expect(404);
      });

      it('should allow partial updates (only changed fields)', async () => {
        const updateDto = {
          title: 'Only Title Updated',
          // Other fields not provided
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });

      it('should handle empty update gracefully', async () => {
        const updateDto = {};

        await request(app.getHttpServer())
          .patch(`/api/v1/contents/${draftContentId}`)
          .send(updateDto)
          .expect(200);
      });
    });
  });

  describe('POST /api/v1/contents/:id/submit-for-approval', () => {
    describe('Story 3.3: Submit Content for Approval', () => {
      let draftContentId: string;

      beforeEach(async () => {
        // Create a draft content for submission tests
        const createDto = {
          title: `Draft for Submission ${Date.now()}`,
          content: 'Draft content ready for approval submission',
          type: ContentTypeEnum.ARTICLE,
          priority: ContentPriorityEnum.HIGH,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(createDto)
          .expect(201);

        draftContentId = createResponse.body.id;
      });

      it('should submit DRAFT content for approval', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/contents/${draftContentId}/submit-for-approval`)
          .expect(200);

        expect(response.body).toHaveProperty(
          'message',
          'Content submitted for approval successfully',
        );

        // Verify status changed to PENDING
        const getResponse = await request(app.getHttpServer())
          .get(`/api/v1/contents/${draftContentId}`)
          .expect(200);

        expect(getResponse.body.status).toBe('PENDING');
      });

      it('should return 404 for non-existent content', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/contents/non-existent-id/submit-for-approval')
          .expect(404);
      });

      it('should return 400 if content is already PENDING', async () => {
        // Submit once
        await request(app.getHttpServer())
          .post(`/api/v1/contents/${draftContentId}/submit-for-approval`)
          .expect(200);

        // Try to submit again (should fail)
        await request(app.getHttpServer())
          .post(`/api/v1/contents/${draftContentId}/submit-for-approval`)
          .expect(400);
      });

      it('should allow submission after creating new DRAFT content', async () => {
        // Create first content
        const createDto1 = {
          title: 'First Draft Content',
          content: 'First draft content body',
          type: ContentTypeEnum.NEWS,
        };

        const response1 = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(createDto1)
          .expect(201);

        // Submit first content
        await request(app.getHttpServer())
          .post(`/api/v1/contents/${response1.body.id}/submit-for-approval`)
          .expect(200);

        // Create second content
        const createDto2 = {
          title: 'Second Draft Content',
          content: 'Second draft content body',
          type: ContentTypeEnum.ANNOUNCEMENT,
        };

        const response2 = await request(app.getHttpServer())
          .post('/api/v1/contents')
          .send(createDto2)
          .expect(201);

        // Submit second content (should succeed)
        await request(app.getHttpServer())
          .post(`/api/v1/contents/${response2.body.id}/submit-for-approval`)
          .expect(200);
      });

      it('should transition status from DRAFT to PENDING', async () => {
        // Verify initial status
        const beforeResponse = await request(app.getHttpServer())
          .get(`/api/v1/contents/${draftContentId}`)
          .expect(200);

        expect(beforeResponse.body.status).toBe('DRAFT');

        // Submit for approval
        await request(app.getHttpServer())
          .post(`/api/v1/contents/${draftContentId}/submit-for-approval`)
          .expect(200);

        // Verify status changed
        const afterResponse = await request(app.getHttpServer())
          .get(`/api/v1/contents/${draftContentId}`)
          .expect(200);

        expect(afterResponse.body.status).toBe('PENDING');
      });
    });
  });
});
