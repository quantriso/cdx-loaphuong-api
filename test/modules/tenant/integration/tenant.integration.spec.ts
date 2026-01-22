/**
 * Tenant Module Integration Tests
 *
 * These tests verify the integration between different layers:
 * - Controller → Command/Query Bus → Handler → Repository
 * - Event publishing and projection updates
 * - Uniqueness validation
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

describe('TenantModule (Integration)', () => {
  let app: INestApplication;
  let createdTenantId: string;
  let createdTenantSubdomain: string;

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
    // TODO: Uncomment when available
    // app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60000); // 60s timeout for app initialization

  afterAll(async () => {
    await app.close();
  }, 30000); // 30s timeout for cleanup

  describe('POST /tenants', () => {
    it('should create a new tenant', async () => {
      const createDto = {
        name: `Test Tenant ${Date.now()}`,
        adminPassword: 'SecurePass123!',
        brandingConfig: {
          logo: 'https://example.com/logo.png',
          primaryColor: '#FF0000',
        },
        limits: {
          maxUsers: 100,
          maxContent: 1000,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenantId');
      expect(response.body).toHaveProperty('name', createDto.name);
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body).toHaveProperty('adminCredentials');
      expect(response.body.adminCredentials).toHaveProperty('email');

      createdTenantId = response.body.id;
      createdTenantSubdomain = response.body.tenantId;
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        name: '', // Empty name should fail validation
        adminPassword: '123', // Too short password should fail
      };

      await request(app.getHttpServer())
        .post('/tenants')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 409 for duplicate subdomain', async () => {
      const duplicateName = `Duplicate Test ${Date.now()}`;

      const createDto = {
        name: duplicateName,
        adminPassword: 'SecurePass123!',
      };

      // Create first tenant
      await request(app.getHttpServer())
        .post('/tenants')
        .send(createDto)
        .expect(201);

      // Try to create duplicate (same name generates same subdomain)
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send(createDto)
        .expect(409);

      expect(response.body.error).toHaveProperty(
        'code',
        'TENANT_UNIQUENESS_VIOLATION',
      );
    });
  });

  describe('GET /tenants/:id', () => {
    it('should return tenant by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/${createdTenantId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdTenantId);
      expect(response.body).toHaveProperty('tenantId', createdTenantSubdomain);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('status', 'ACTIVE');
      expect(response.body).toHaveProperty('brandingConfig');
      expect(response.body).toHaveProperty('limits');
    });

    it('should return 404 for non-existent tenant', async () => {
      await request(app.getHttpServer())
        .get('/tenants/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /tenants', () => {
    it('should return paginated tenant list', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.total).toBe('number');
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);

      // All returned tenants should have ACTIVE status
      response.body.items.forEach((tenant: { status: string }) => {
        expect(tenant.status).toBe('ACTIVE');
      });
    });

    it('should sort by different fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .query({ sortBy: 'name', sortOrder: 'ASC' })
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('PATCH /tenants/:id', () => {
    it('should update tenant configuration', async () => {
      const updateDto = {
        name: `Updated Tenant ${Date.now()}`,
        brandingConfig: {
          logo: 'https://example.com/new-logo.png',
          primaryColor: '#00FF00',
        },
        limits: {
          maxUsers: 200,
          maxContent: 2000,
        },
      };

      await request(app.getHttpServer())
        .patch(`/tenants/${createdTenantId}`)
        .send(updateDto)
        .expect(200);

      // Verify update
      const getResponse = await request(app.getHttpServer())
        .get(`/tenants/${createdTenantId}`)
        .expect(200);

      expect(getResponse.body.name).toBe(updateDto.name);
      expect(getResponse.body.brandingConfig.primaryColor).toBe('#00FF00');
      expect(getResponse.body.limits.maxUsers).toBe(200);
    });

    it('should return 404 when updating non-existent tenant', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .patch('/tenants/non-existent-id')
        .send(updateDto)
        .expect(404);
    });
  });

  describe('POST /tenants/:id/reset-admin-password', () => {
    it('should return tenant info (Epic 2 placeholder)', async () => {
      const resetDto = {};

      const response = await request(app.getHttpServer())
        .post(`/tenants/${createdTenantId}/reset-admin-password`)
        .send(resetDto)
        .expect(200);

      expect(response.body).toHaveProperty('tenantId', createdTenantSubdomain);
      expect(response.body).toHaveProperty('adminEmail');
      expect(response.body).toHaveProperty('temporaryPassword');
      expect(response.body).toHaveProperty('passwordReset', false);
    });

    it('should return 404 for non-existent tenant', async () => {
      await request(app.getHttpServer())
        .post('/tenants/non-existent-id/reset-admin-password')
        .send({})
        .expect(404);
    });
  });

  describe('DELETE /tenants/:id', () => {
    it('should soft delete tenant', async () => {
      const deleteDto = {
        reason: 'Integration test cleanup',
      };

      await request(app.getHttpServer())
        .delete(`/tenants/${createdTenantId}`)
        .send(deleteDto)
        .expect(204);

      // Verify tenant is soft deleted
      const getResponse = await request(app.getHttpServer())
        .get(`/tenants/${createdTenantId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('DELETED');
      expect(getResponse.body.deletedAt).not.toBeNull();
    });

    it('should return 404 when deleting non-existent tenant', async () => {
      const deleteDto = {
        reason: 'Test',
      };

      await request(app.getHttpServer())
        .delete('/tenants/non-existent-id')
        .send(deleteDto)
        .expect(404);
    });

    it('should return 403 when trying to delete already deleted tenant', async () => {
      // Create a new tenant
      const createDto = {
        name: `Delete Test ${Date.now()}`,
        adminPassword: 'SecurePass123!',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tenants')
        .send(createDto)
        .expect(201);

      const tenantId = createResponse.body.id;

      // Delete once
      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}`)
        .send({ reason: 'First delete' })
        .expect(204);

      // Try to delete again
      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}`)
        .send({ reason: 'Second delete' })
        .expect(403);
    });
  });

  describe('Business Logic', () => {
    it('should enforce subdomain uniqueness across tenants', async () => {
      const baseName = `Unique Test ${Date.now()}`;

      // Create first tenant
      const firstDto = {
        name: baseName,
        adminPassword: 'SecurePass123!',
      };

      await request(app.getHttpServer())
        .post('/tenants')
        .send(firstDto)
        .expect(201);

      // Try to create second with same subdomain
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send(firstDto)
        .expect(409);

      expect(response.body.error.code).toBe('TENANT_UNIQUENESS_VIOLATION');
    });

    it('should prevent modifying deleted tenant', async () => {
      // Create and delete a tenant
      const createDto = {
        name: `Deleted Tenant ${Date.now()}`,
        adminPassword: 'SecurePass123!',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tenants')
        .send(createDto)
        .expect(201);

      const tenantId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/tenants/${tenantId}`)
        .send({ reason: 'Test deletion' })
        .expect(204);

      // Try to update deleted tenant
      const updateDto = {
        name: 'Should Fail',
      };

      await request(app.getHttpServer())
        .patch(`/tenants/${tenantId}`)
        .send(updateDto)
        .expect(400); // Should throw DomainException: Cannot modify deleted tenant
    });
  });
});
