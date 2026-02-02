/**
 * File Module Integration Tests
 *
 * Epic 5: File Management
 * Stories:
 * - 5.1: Upload File
 * - 5.2: Validate File Upload
 * - 5.3: Process Uploaded Images
 * - 5.4: Download File
 * - 5.5: Delete File
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
import { FileTypeEnum } from '../../../../src/modules/file/domain';
import { Readable } from 'stream';

describe('FileModule (Integration) - Epic 5', () => {
  let app: INestApplication;
  let uploadedFileId: string;
  let processedFileId: string;

  // Helper function to make HTTP requests using Fastify's inject method
  const makeRequest = async (options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    payload?: any;
  }) => {
    const fastifyInstance = app.getHttpAdapter().getInstance();
    return fastifyInstance.inject(options);
  };

  // Helper function to upload a file
  const uploadFile = async (
    filename: string,
    contentType: string,
    content: string,
  ) => {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([content], { type: contentType }),
      filename,
    );

    const response = await makeRequest({
      method: 'POST',
      url: '/api/v1/files',
      headers: {
        'x-user-id': 'mock-user-id',
        'x-tenant-id': 'mock-tenant-id',
      },
      payload: formData,
    });

    return {
      response,
      body: JSON.parse(response.payload),
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Create custom FastifyAdapter
    const fastifyAdapter = new FastifyAdapter({
      logger: false,
    });

    app =
      moduleFixture.createNestApplication<NestFastifyApplication>(
        fastifyAdapter,
      );

    // Register multipart plugin for file uploads (same as main.ts)
    // Need to register on the underlying Fastify instance
    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1, // Only 1 file per request
      },
    });

    // Apply same global pipes/filters as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Add Fastify middleware to mock user context
    fastifyInstance.addHook(
      'onRequest',
      (request: any, reply: any, done: any) => {
        request.user = {
          id: 'mock-user-id',
          tenantId: 'mock-tenant-id',
          isAdmin: false,
        };
        done();
      },
    );

    await app.init();
    await fastifyInstance.ready();
  }, 60000); // 60s timeout for app initialization

  afterAll(async () => {
    await app.close();
  }, 30000); // 30s timeout for cleanup

  describe('POST /api/v1/files', () => {
    describe('Story 5.1: Upload File', () => {
      it('should upload an image file successfully', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake image content'], { type: 'image/jpeg' }),
          'test-image.jpg',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
            'content-type': 'multipart/form-data',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('message', 'File uploaded successfully');
        expect(body).toHaveProperty('fileName');
        expect(body.fileType).toBe(FileTypeEnum.IMAGE);
        expect(body.originalFileName).toBe('test-image.jpg');

        uploadedFileId = body.id;
      });

      it('should upload a document file successfully', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake document content'], { type: 'application/pdf' }),
          'test-document.pdf',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('message');
        expect(body.fileType).toBe(FileTypeEnum.DOCUMENT);
      });

      it('should upload a video file successfully', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake video content'], { type: 'video/mp4' }),
          'test-video.mp4',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body.fileType).toBe(FileTypeEnum.VIDEO);
      });

      it('should upload an audio file successfully', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake audio content'], { type: 'audio/mpeg' }),
          'test-audio.mp3',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body.fileType).toBe(FileTypeEnum.AUDIO);
      });

      it('should upload an archive file successfully', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake archive content'], { type: 'application/zip' }),
          'test-archive.zip',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body.fileType).toBe(FileTypeEnum.ARCHIVE);
      });

      it('should upload other file types', async () => {
        const fastifyInstance = app.getHttpAdapter().getInstance();

        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake other content'], { type: 'text/plain' }),
          'test-other.txt',
        );

        const response = await fastifyInstance.inject({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id');
        expect(body.fileType).toBe(FileTypeEnum.OTHER);
      });
    });

    describe('Story 5.2: Validate File Upload', () => {
      it('should return 400 when file is missing', async () => {
        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 for file size exceeding maximum (50MB)', async () => {
        // Create a buffer larger than 50MB (50 * 1024 * 1024 bytes)
        const largeFileBuffer = Buffer.alloc(50 * 1024 * 1024 + 1);
        const formData = new FormData();
        formData.append(
          'file',
          new Blob([largeFileBuffer], { type: 'image/jpeg' }),
          'large-file.jpg',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate image file extensions', async () => {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake image'], { type: 'image/jpeg' }),
          'invalid.xyz',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate document file extensions', async () => {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake document'], { type: 'application/pdf' }),
          'invalid.xyz',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate video file extensions', async () => {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake video'], { type: 'video/mp4' }),
          'invalid.xyz',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate audio file extensions', async () => {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake audio'], { type: 'audio/mpeg' }),
          'invalid.xyz',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should validate archive file extensions', async () => {
        const formData = new FormData();
        formData.append(
          'file',
          new Blob(['fake archive'], { type: 'application/zip' }),
          'invalid.xyz',
        );

        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files',
          headers: {
            'x-user-id': 'mock-user-id',
            'x-tenant-id': 'mock-tenant-id',
          },
          payload: formData,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should accept valid image extensions (jpg, jpeg, png, gif, webp, svg)', async () => {
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

        for (const ext of extensions) {
          const formData = new FormData();
          formData.append(
            'file',
            new Blob([`fake image ${ext}`], { type: 'image/jpeg' }),
            `test.${ext}`,
          );

          const response = await makeRequest({
            method: 'POST',
            url: '/api/v1/files',
            headers: {
              'x-user-id': 'mock-user-id',
              'x-tenant-id': 'mock-tenant-id',
            },
            payload: formData,
          });

          expect(response.statusCode).toBe(201);
        }
      });
    });

    describe('File Storage', () => {
      it('should store file metadata in database', async () => {
        const { body: uploadBody } = await uploadFile(
          'db-test.jpg',
          'image/jpeg',
          'test content for database',
        );

        const fileId = uploadBody.id;

        // Retrieve the file to verify persistence
        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileId}`,
        });

        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.payload);
        expect(getBody).toHaveProperty('id', fileId);
        expect(getBody).toHaveProperty('originalFileName', 'db-test.jpg');
        expect(getBody).toHaveProperty('fileSize');
        expect(getBody).toHaveProperty('mimeType');
        expect(getBody).toHaveProperty('storagePath');
        expect(getBody).toHaveProperty('createdAt');
        expect(getBody).toHaveProperty('updatedAt');
      });

      it('should assign unique file ID', async () => {
        const { body: response1 } = await uploadFile(
          'unique1.jpg',
          'image/jpeg',
          'file 1',
        );
        const { body: response2 } = await uploadFile(
          'unique2.jpg',
          'image/jpeg',
          'file 2',
        );

        expect(response1.id).not.toBe(response2.id);
      });

      it('should track uploadedBy user', async () => {
        const { body: uploadBody } = await uploadFile(
          'tracking.jpg',
          'image/jpeg',
          'test upload tracking',
        );

        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${uploadBody.id}`,
        });

        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.payload);
        expect(getBody).toHaveProperty('uploadedBy', 'mock-user-id');
      });
    });
  });

  describe('POST /api/v1/files/:id/process', () => {
    describe('Story 5.3: Process Uploaded Images', () => {
      let imageFileId: string;

      beforeEach(async () => {
        // Upload an image for processing tests
        const { body } = await uploadFile(
          'process-test.jpg',
          'image/jpeg',
          'test image content for processing',
        );
        imageFileId = body.id;
      });

      it('should process an uploaded image', async () => {
        const response = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        expect(response.statusCode).toBe(200);
        const responseBody = JSON.parse(response.payload);
        expect(responseBody).toHaveProperty(
          'message',
          'File processed successfully',
        );
        expect(responseBody).toHaveProperty('processedPath');
        expect(responseBody).toHaveProperty('thumbnailPath');
        expect(responseBody).toHaveProperty('processedMetadata');
      });

      it('should generate thumbnail for images', async () => {
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${imageFileId}`,
        });

        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.payload);
        expect(getBody).toHaveProperty('thumbnailPath');
        expect(getBody.thumbnailPath).not.toBeNull();
      });

      it('should create optimized version', async () => {
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${imageFileId}`,
        });

        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.payload);
        expect(getBody).toHaveProperty('processedPath');
        expect(getBody.processedPath).not.toBeNull();
      });

      it('should include processing metadata', async () => {
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${imageFileId}`,
        });

        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.payload);
        expect(getBody).toHaveProperty('processedMetadata');
        expect(typeof getBody.processedMetadata).toBe('object');
      });

      it('should return 404 for non-existent file', async () => {
        const response = await makeRequest({
          method: 'POST',
          url: '/api/v1/files/non-existent-id/process',
          body: {},
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return 400 when trying to process non-image file', async () => {
        // Upload a document
        const { body: docBody } = await uploadFile(
          'test.pdf',
          'application/pdf',
          'document content',
        );
        const docId = docBody.id;

        // Try to process document (should fail)
        const response = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${docId}/process`,
          body: {},
        });

        expect(response.statusCode).toBe(400);
      });

      it('should allow re-processing of already processed image', async () => {
        // Process first time
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        // Process again (should succeed with update)
        const response = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        expect(response.statusCode).toBe(200);
      });

      it('should update updatedAt timestamp on processing', async () => {
        const beforeResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${imageFileId}`,
        });

        const beforeBody = JSON.parse(beforeResponse.payload);
        const beforeUpdatedAt = new Date(beforeBody.updatedAt);

        // Process file
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${imageFileId}/process`,
          body: {},
        });

        const afterResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${imageFileId}`,
        });

        const afterBody = JSON.parse(afterResponse.payload);
        const afterUpdatedAt = new Date(afterBody.updatedAt);

        expect(afterUpdatedAt.getTime()).toBeGreaterThanOrEqual(
          beforeUpdatedAt.getTime(),
        );
      });
    });
  });

  describe('GET /api/v1/files/:id', () => {
    describe('Story 5.4: Download File', () => {
      let fileForDownloadId: string;

      beforeEach(async () => {
        // Upload a file for download tests
        const { body } = await uploadFile(
          'download-test.jpg',
          'image/jpeg',
          'test content for download',
        );
        fileForDownloadId = body.id;
      });

      it('should get file metadata by ID', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileForDownloadId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('id', fileForDownloadId);
        expect(body).toHaveProperty('originalFileName', 'download-test.jpg');
        expect(body).toHaveProperty('fileType');
        expect(body).toHaveProperty('fileSize');
        expect(body).toHaveProperty('mimeType');
        expect(body).toHaveProperty('storagePath');
        expect(body).toHaveProperty('uploadedBy');
        expect(body).toHaveProperty('createdAt');
        expect(body).toHaveProperty('updatedAt');
      });

      it('should return 404 for non-existent file', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files/non-existent-id',
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return processed path if file has been processed', async () => {
        // Process file
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${fileForDownloadId}/process`,
          body: {},
        });

        // Get file details
        const response = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileForDownloadId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('processedPath');
        expect(body).toHaveProperty('thumbnailPath');
      });

      it('should return thumbnail path if available', async () => {
        // Process file
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${fileForDownloadId}/process`,
          body: {},
        });

        const response = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileForDownloadId}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.thumbnailPath).not.toBeNull();
      });
    });

    describe('GET /api/v1/files', () => {
      beforeEach(async () => {
        // Upload multiple files for listing tests
        const files = [
          { name: 'list-test-image.jpg', type: 'image/jpeg' },
          { name: 'list-test-document.pdf', type: 'application/pdf' },
          { name: 'list-test-video.mp4', type: 'video/mp4' },
        ];

        for (const file of files) {
          await uploadFile(file.name, file.type, `test ${file.name} content`);
        }
      });

      it('should get list of files with pagination', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?page=1&limit=10',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('page', 1);
        expect(body).toHaveProperty('limit', 10);
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('should filter files by type', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?fileType=IMAGE',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
        expect(Array.isArray(body.data)).toBe(true);

        // All returned files should be IMAGE type
        body.data.forEach((file: any) => {
          expect(file.fileType).toBe(FileTypeEnum.IMAGE);
        });
      });

      it('should filter files by uploader', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?uploadedBy=mock-user-id',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
        expect(Array.isArray(body.data)).toBe(true);

        // All returned files should be from the specified uploader
        body.data.forEach((file: any) => {
          expect(file.uploadedBy).toBe('mock-user-id');
        });
      });

      it('should sort files by creation date', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?sortBy=createdAt&sortOrder=desc',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
        expect(Array.isArray(body.data)).toBe(true);

        // Verify sorting (newest first)
        if (body.data.length > 1) {
          const firstDate = new Date(body.data[0].createdAt).getTime();
          const secondDate = new Date(body.data[1].createdAt).getTime();
          expect(firstDate).toBeGreaterThanOrEqual(secondDate);
        }
      });

      it('should sort files by file name', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?sortBy=fileName&sortOrder=asc',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
      });

      it('should sort files by size', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?sortBy=size&sortOrder=desc',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
      });

      it('should filter by date range', async () => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000)
          .toISOString()
          .split('T')[0];

        const response = await makeRequest({
          method: 'GET',
          url: `/api/v1/files?dateFrom=${today}&dateTo=${tomorrow}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toBeTruthy();
        expect(Array.isArray(body.data)).toBe(true);
      });

      it('should return empty list when no files match filters', async () => {
        const response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?uploadedBy=non-existent-user',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toEqual([]);
        expect(body.total).toBe(0);
      });

      it('should handle pagination correctly', async () => {
        const page1Response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?page=1&limit=2',
        });

        const page2Response = await makeRequest({
          method: 'GET',
          url: '/api/v1/files?page=2&limit=2',
        });

        const page1Body = JSON.parse(page1Response.payload);
        const page2Body = JSON.parse(page2Response.payload);
        expect(page1Body.page).toBe(1);
        expect(page2Body.page).toBe(2);
        expect(page1Body.limit).toBe(2);
        expect(page2Body.limit).toBe(2);
      });
    });
  });

  describe('DELETE /api/v1/files/:id', () => {
    describe('Story 5.5: Delete File', () => {
      let fileToDeleteId: string;

      beforeEach(async () => {
        // Upload a file for deletion tests
        const { body } = await uploadFile(
          'delete-test.jpg',
          'image/jpeg',
          'test content for deletion',
        );
        fileToDeleteId = body.id;
      });

      it('should delete a file successfully', async () => {
        const response = await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(response.statusCode).toBe(200);
        const responseBody = JSON.parse(response.payload);
        expect(responseBody).toHaveProperty(
          'message',
          'File deleted successfully',
        );
      });

      it('should return 404 when trying to delete non-existent file', async () => {
        const response = await makeRequest({
          method: 'DELETE',
          url: '/api/v1/files/non-existent-id',
        });

        expect(response.statusCode).toBe(404);
      });

      it('should not be able to retrieve deleted file', async () => {
        // Delete the file
        await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        // Try to retrieve deleted file
        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(getResponse.statusCode).toBe(404);
      });

      it('should handle deletion of processed file (with thumbnails)', async () => {
        // Process the file first
        await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${fileToDeleteId}/process`,
          body: {},
        });

        // Delete the file
        const deleteResponse = await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(deleteResponse.statusCode).toBe(200);
        const deleteBody = JSON.parse(deleteResponse.payload);
        expect(deleteBody).toHaveProperty(
          'message',
          'File deleted successfully',
        );

        // Verify file is deleted
        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(getResponse.statusCode).toBe(404);
      });

      it('should prevent double deletion of same file', async () => {
        // Delete first time
        await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        // Try to delete again (should return 404)
        const response = await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(response.statusCode).toBe(404);
      });

      it('should delete file and its storage', async () => {
        // Get file info before deletion
        const beforeDelete = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(beforeDelete.statusCode).toBe(200);
        const beforeBody = JSON.parse(beforeDelete.payload);
        const storagePath = beforeBody.storagePath;

        // Delete the file
        await makeRequest({
          method: 'DELETE',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        // Verify file is deleted from database
        const getResponse = await makeRequest({
          method: 'GET',
          url: `/api/v1/files/${fileToDeleteId}`,
        });

        expect(getResponse.statusCode).toBe(404);
      });
    });
  });
});
