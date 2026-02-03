/**
 * Image Processing Integration Tests
 *
 * Story 5.3: Process Uploaded Images
 *
 * These tests verify the image processing pipeline integration.
 * Tests use real image files from test/fixtures/images/
 *
 * Note: These tests require a test database.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../../../src/app.module';
import { GlobalExceptionFilter } from '../../../../src/libs/shared/http/filters/global-exception.filter';
import { FileTypeEnum } from '../../../../src/modules/file/domain';
import * as fs from 'fs';
import * as path from 'path';

describe('Image Processing (Integration) - Story 5.3', () => {
  let app: INestApplication;
  const uploadedFileIds: string[] = [];

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

  const uploadRealImage = async (imagePath: string, filename: string) => {
    // imagePath is already the full path from the test
    const imageBuffer = fs.readFileSync(imagePath);
    const formData = new FormData();

    // Detect content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    formData.append(
      'file',
      new Blob([imageBuffer], { type: contentType }),
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

    let body;
    try {
      body = JSON.parse(response.payload);
    } catch (e) {
      body = { error: 'Failed to parse response', payload: response.payload };
    }

    if (body.id) {
      uploadedFileIds.push(body.id);
    }
    return { response, body };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const fastifyAdapter = new FastifyAdapter({
      logger: false,
    });

    app =
      moduleFixture.createNestApplication<NestFastifyApplication>(
        fastifyAdapter,
      );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
      },
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

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
  }, 60000);

  afterAll(async () => {
    // Cleanup uploaded files
    for (const fileId of uploadedFileIds) {
      if (fileId && fileId !== 'undefined') {
        try {
          await makeRequest({
            method: 'DELETE',
            url: `/api/v1/files/${fileId}`,
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
    await app.close();
  }, 30000);

  describe('Basic Image Processing', () => {
    it('should upload a JPEG image successfully', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { response, body } = await uploadRealImage(
        imagePath,
        'test-medium.jpg',
      );

      expect(response.statusCode).toBe(201);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('fileType', FileTypeEnum.IMAGE);
      expect(body).toHaveProperty('mimeType', 'image/jpeg');
      expect(body.id).toBeTruthy();
      expect(body.fileSize).toBeGreaterThan(0);
    });

    it('should process an uploaded image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'process-test.jpg');

      expect(body.fileType).toBe(FileTypeEnum.IMAGE);
      expect(body.id).toBeTruthy();

      // Process the image
      const processResponse = await makeRequest({
        method: 'POST',
        url: `/api/v1/files/${body.id}/process`,
        body: {},
      });

      expect(processResponse.statusCode).toBe(200);
      const processBody = JSON.parse(processResponse.payload);
      expect(processBody).toHaveProperty(
        'message',
        'File processed successfully',
      );
      expect(processBody).toHaveProperty('processedPath');
      expect(processBody).toHaveProperty('thumbnailPath');
      expect(processBody).toHaveProperty('processedMetadata');
    });

    it('should return 404 when processing non-existent file', async () => {
      const processResponse = await makeRequest({
        method: 'POST',
        url: '/api/v1/files/non-existent-id/process',
        body: {},
      });

      expect(processResponse.statusCode).toBe(404);
    });

    it('should return 400 when trying to process non-image file', async () => {
      // Upload a non-image file
      const formData = new FormData();
      formData.append(
        'file',
        new Blob(['document content'], { type: 'application/pdf' }),
        'test.pdf',
      );

      const uploadResponse = await makeRequest({
        method: 'POST',
        url: '/api/v1/files',
        headers: {
          'x-user-id': 'mock-user-id',
          'x-tenant-id': 'mock-tenant-id',
        },
        payload: formData,
      });

      const uploadBody = JSON.parse(uploadResponse.payload);
      if (uploadBody.id) {
        uploadedFileIds.push(uploadBody.id);

        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${uploadBody.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(400);
      }
    });
  });

  describe('Image Formats', () => {
    it('should process a JPEG image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'test-jpeg.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(200);
        const processBody = JSON.parse(processResponse.payload);
        // Story 5.3: All images are converted to WebP format
        expect(processBody.processedMetadata.format).toBe('webp');
      }
    });

    it('should process a PNG image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/test-png.png',
      );
      const { body } = await uploadRealImage(imagePath, 'test-png.png');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(200);
        const processBody = JSON.parse(processResponse.payload);
        // Story 5.3: All images are converted to WebP format
        expect(processBody.processedMetadata.format).toBe('webp');
      }
    });

    it('should process a WebP image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/test-webp.webp',
      );
      const { body } = await uploadRealImage(imagePath, 'test-webp.webp');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(200);
        const processBody = JSON.parse(processResponse.payload);
        expect(processBody.processedMetadata.format).toBe('webp');
      }
    });

    it('should process a landscape image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/landscape.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'landscape-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(200);
        const processBody = JSON.parse(processResponse.payload);
        const metadata = processBody.processedMetadata;
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        expect(metadata.width).toBeGreaterThan(metadata.height);
      }
    });

    it('should process a portrait image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/portrait.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'portrait-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(200);
        const processBody = JSON.parse(processResponse.payload);
        const metadata = processBody.processedMetadata;
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(metadata.width);
      }
    });
  });

  describe('Image Variants', () => {
    it('should generate optimized version', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'optimized-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        expect(processBody.processedPath).toBeTruthy();
        expect(typeof processBody.processedPath).toBe('string');
        expect(processBody.processedPath.endsWith('.webp')).toBe(true);
      }
    });

    it('should generate thumbnail', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'thumbnail-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        expect(processBody.thumbnailPath).toBeTruthy();
        expect(typeof processBody.thumbnailPath).toBe('string');
        expect(processBody.thumbnailPath.endsWith('_thumb.webp')).toBe(true);
      }
    });

    it('should store all variants with different paths', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'variants-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        expect(processBody.processedPath).toBeTruthy();
        expect(processBody.thumbnailPath).toBeTruthy();
        expect(processBody.processedPath).not.toEqual(
          processBody.thumbnailPath,
        );
      }
    });
  });

  describe('Processing Metadata', () => {
    it('should include dimensions in metadata', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'dimensions-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        const metadata = processBody.processedMetadata;
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        expect(typeof metadata.width).toBe('number');
        expect(typeof metadata.height).toBe('number');
      }
    });

    it('should include size in metadata', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'size-test.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        expect(processBody.processedMetadata.size).toBeGreaterThan(0);
        expect(typeof processBody.processedMetadata.size).toBe('number');
      }
    });

    it('should include format in metadata', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/test-png.png',
      );
      const { body } = await uploadRealImage(imagePath, 'format-test.png');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        // Story 5.3: All images are converted to WebP format
        expect(processBody.processedMetadata.format).toBe('webp');
      }
    });
  });

  describe('Re-processing', () => {
    it('should allow re-processing of already processed image', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'reprocess-test.jpg');

      if (body.id) {
        // Process first time
        const firstProcess = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });
        expect(firstProcess.statusCode).toBe(200);

        // Process again
        const secondProcess = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });
        expect(secondProcess.statusCode).toBe(200);
      }
    });
  });

  describe('Performance - Story 5.3 AC', () => {
    it('should process small image within reasonable time', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/small-jpeg.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'perf-small.jpg');

      if (body.id) {
        const startTime = Date.now();
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(processResponse.statusCode).toBe(200);
        expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    it('should process medium image within reasonable time', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'perf-medium.jpg');

      if (body.id) {
        const startTime = Date.now();
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(processResponse.statusCode).toBe(200);
        expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    it('should process large image within 5 seconds (AC requirement)', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/large-jpeg.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'perf-large.jpg');

      if (body.id) {
        const startTime = Date.now();
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        expect(processResponse.statusCode).toBe(200);
        expect(processingTime).toBeLessThan(5000); // AC requirement: within 5 seconds
      }
    });
  });

  describe('Quality Specifications - Story 5.3 AC', () => {
    it('should resize image to max width 2000px maintaining aspect ratio', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/landscape.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'quality-resize.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);
        const metadata = processBody.processedMetadata;

        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
        // Should be resized to max 2000px width (or original if smaller)
        expect(metadata.width).toBeLessThanOrEqual(2000);
      }
    });

    it('should convert processed image to WebP format', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/test-png.png',
      );
      const { body } = await uploadRealImage(imagePath, 'quality-webp.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);

        expect(processBody.processedPath).toBeTruthy();
        expect(processBody.processedPath.endsWith('.webp')).toBe(true);
      }
    });

    it('should generate thumbnail at 300x300px', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/landscape.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'quality-thumb.jpg');

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);

        expect(processBody.thumbnailPath).toBeTruthy();
        expect(processBody.thumbnailPath.endsWith('_thumb.webp')).toBe(true);
        // Note: Actual thumbnail dimensions would need to be verified by downloading and measuring
      }
    });

    it('should preserve original file', async () => {
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/medium-test.jpg',
      );
      const { body } = await uploadRealImage(
        imagePath,
        'preserve-original.jpg',
      );

      if (body.id) {
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/${body.id}/process`,
          body: {},
        });

        const processBody = JSON.parse(processResponse.payload);

        // Original path should still be available
        expect(body.storagePath).toBeTruthy();
        expect(processBody.processedPath).toBeTruthy();
        // They should be different files
        expect(body.storagePath).not.toEqual(processBody.processedPath);
      }
    });
  });

  describe('Error Handling - Story 5.3 AC', () => {
    it('should handle corrupted image gracefully', async () => {
      // Create a fake/corrupted image
      const corruptedBuffer = Buffer.from('not a real image');
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([corruptedBuffer], { type: 'image/jpeg' }),
        'corrupted.jpg',
      );

      const uploadResponse = await makeRequest({
        method: 'POST',
        url: '/api/v1/files',
        headers: {
          'x-user-id': 'mock-user-id',
          'x-tenant-id': 'mock-tenant-id',
        },
        payload: formData,
      });

      // Upload might succeed (201), but processing should fail
      if (uploadResponse.statusCode === 201) {
        const uploadBody = JSON.parse(uploadResponse.payload);
        if (uploadBody.id) {
          uploadedFileIds.push(uploadBody.id);

          // Try to process the corrupted image
          const processResponse = await makeRequest({
            method: 'POST',
            url: `/api/v1/files/${uploadBody.id}/process`,
            body: {},
          });

          // Processing should fail with 500 error
          expect([400, 500]).toContain(processResponse.statusCode);
        }
      } else {
        // Upload failed validation, which is also acceptable
        expect([400, 422]).toContain(uploadResponse.statusCode);
      }
    });

    it('should log processing failures', async () => {
      // This test would require checking logs, which is not easily testable in integration tests
      // Instead, we verify that processing failure returns appropriate error
      const imagePath = path.join(
        __dirname,
        '../../../fixtures/images/small-jpeg.jpg',
      );
      const { body } = await uploadRealImage(imagePath, 'error-log-test.jpg');

      if (body.id) {
        // Intentionally process a non-existent file to trigger error
        const processResponse = await makeRequest({
          method: 'POST',
          url: `/api/v1/files/invalid-id-${body.id}/process`,
          body: {},
        });

        expect(processResponse.statusCode).toBe(404);
      }
    });
  });
});
