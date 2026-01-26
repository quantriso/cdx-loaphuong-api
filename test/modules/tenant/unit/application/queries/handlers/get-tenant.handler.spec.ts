import { GetTenantHandler } from '../../../../../../../src/modules/tenant/application/queries/handlers/get-tenant.handler';
import { GetTenantQuery } from '../../../../../../../src/modules/tenant/application/queries/get-tenant.query';
import {
  ITenantReadDao,
  TenantReadDto,
} from '../../../../../../../src/modules/tenant/application/queries/ports/tenant-read-dao.interface';
import { NotFoundException } from '@nestjs/common';

describe('GetTenantHandler', () => {
  let handler: GetTenantHandler;
  let mockTenantReadDao: jest.Mocked<ITenantReadDao>;

  beforeEach(() => {
    mockTenantReadDao = {
      findById: jest.fn(),
      findBySubdomain: jest.fn(),
      findMany: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new GetTenantHandler(mockTenantReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockTenantDto = (): TenantReadDto => ({
    id: 'tenant-123',
    tenantId: 'test-tenant',
    name: 'Test Tenant',
    status: 'ACTIVE',
    brandingConfig: {
      logo: 'https://example.com/logo.png',
      primaryColor: '#FF0000',
    },
    limits: {
      maxUsers: 100,
      maxContent: 1000,
    },
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'system',
    deletedAt: null,
  });

  describe('execute', () => {
    it('should return tenant when found', async () => {
      const mockTenant = createMockTenantDto();
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(mockTenantReadDao.findById).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockTenantReadDao.findById.mockResolvedValue(null);

      const query: GetTenantQuery = { id: 'non-existent' };

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow(
        'Tenant with id non-existent not found',
      );
    });

    it('should return tenant with null branding config', async () => {
      const mockTenant: TenantReadDto = {
        ...createMockTenantDto(),
        brandingConfig: null,
      };
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(result.brandingConfig).toBeNull();
    });

    it('should return tenant with null limits', async () => {
      const mockTenant: TenantReadDto = {
        ...createMockTenantDto(),
        limits: null,
      };
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(result.limits).toBeNull();
    });

    it('should return tenant with SUSPENDED status', async () => {
      const mockTenant: TenantReadDto = {
        ...createMockTenantDto(),
        status: 'SUSPENDED',
      };
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(result.status).toBe('SUSPENDED');
    });

    it('should return soft-deleted tenant', async () => {
      const deletedDate = new Date('2024-01-15');
      const mockTenant: TenantReadDto = {
        ...createMockTenantDto(),
        status: 'DELETED',
        deletedAt: deletedDate,
      };
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(result.status).toBe('DELETED');
      expect(result.deletedAt).toEqual(deletedDate);
    });

    it('should return all tenant properties correctly', async () => {
      const mockTenant = createMockTenantDto();
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const query: GetTenantQuery = { id: 'tenant-123' };
      const result = await handler.execute(query);

      expect(result).toMatchObject({
        id: 'tenant-123',
        tenantId: 'test-tenant',
        name: 'Test Tenant',
        status: 'ACTIVE',
        version: 1,
        createdBy: 'system',
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('should propagate DAO errors', async () => {
      mockTenantReadDao.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const query: GetTenantQuery = { id: 'tenant-123' };

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('query validation', () => {
    it('should handle empty id', async () => {
      mockTenantReadDao.findById.mockResolvedValue(null);

      const query: GetTenantQuery = { id: '' };

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should handle different id formats', async () => {
      const mockTenant = createMockTenantDto();
      mockTenantReadDao.findById.mockResolvedValue(mockTenant);

      const uuidQuery: GetTenantQuery = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };
      await handler.execute(uuidQuery);

      expect(mockTenantReadDao.findById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });
  });
});
