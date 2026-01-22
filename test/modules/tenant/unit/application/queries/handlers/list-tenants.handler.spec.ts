import { ListTenantsHandler } from '../../../../../../../src/modules/tenant/application/queries/handlers/list-tenants.handler';
import { ListTenantsQuery } from '../../../../../../../src/modules/tenant/application/queries/list-tenants.query';
import {
  ITenantReadDao,
  TenantReadDto,
  ListTenantsResult,
} from '../../../../../../../src/modules/tenant/application/queries/ports/tenant-read-dao.interface';

describe('ListTenantsHandler', () => {
  let handler: ListTenantsHandler;
  let mockTenantReadDao: jest.Mocked<ITenantReadDao>;

  beforeEach(() => {
    mockTenantReadDao = {
      findById: jest.fn(),
      findBySubdomain: jest.fn(),
      findMany: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new ListTenantsHandler(mockTenantReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockTenant = (
    id: string,
    subdomain: string,
    status = 'ACTIVE',
  ): TenantReadDto => ({
    id,
    tenantId: subdomain,
    name: `Tenant ${subdomain}`,
    status,
    brandingConfig: null,
    limits: null,
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'system',
    deletedAt: null,
  });

  describe('execute', () => {
    it('should return paginated tenant list', async () => {
      const mockResult: ListTenantsResult = {
        items: [
          createMockTenant('tenant-1', 'tenant-one'),
          createMockTenant('tenant-2', 'tenant-two'),
        ],
        total: 2,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
      };

      const result = await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 10,
        },
      );
      expect(result).toEqual(mockResult);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply status filter', async () => {
      const mockResult: ListTenantsResult = {
        items: [createMockTenant('tenant-1', 'tenant-one', 'ACTIVE')],
        total: 1,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          status: 'ACTIVE',
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 10,
        },
      );
    });

    it('should use custom sortBy parameter', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        sortBy: 'name',
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'name',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 10,
        },
      );
    });

    it('should use custom sortOrder parameter', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        sortOrder: 'ASC',
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'createdAt',
          sortOrder: 'ASC',
        },
        {
          page: 1,
          limit: 10,
        },
      );
    });

    it('should default to createdAt DESC when no sort specified', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          page: 1,
          limit: 10,
        },
      );
    });

    it('should return empty list when no tenants found', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
      };

      const result = await handler.execute(query);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle different page sizes', async () => {
      const mockResult: ListTenantsResult = {
        items: Array.from({ length: 50 }, (_, i) =>
          createMockTenant(`tenant-${i}`, `tenant-${i}`),
        ),
        total: 100,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 2,
        limit: 50,
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        {
          page: 2,
          limit: 50,
        },
      );
    });

    it('should support sorting by updatedAt', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'ASC',
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'updatedAt',
          sortOrder: 'ASC',
        },
        expect.any(Object),
      );
    });

    it('should support sorting by status', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 0,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        sortBy: 'status',
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        {
          sortBy: 'status',
          sortOrder: 'DESC',
        },
        expect.any(Object),
      );
    });

    it('should filter SUSPENDED tenants', async () => {
      const mockResult: ListTenantsResult = {
        items: [createMockTenant('tenant-1', 'tenant-one', 'SUSPENDED')],
        total: 1,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
        status: 'SUSPENDED',
      };

      const result = await handler.execute(query);

      expect(result.items[0].status).toBe('SUSPENDED');
    });
  });

  describe('error handling', () => {
    it('should propagate DAO errors', async () => {
      mockTenantReadDao.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
      };

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('pagination edge cases', () => {
    it('should handle first page', async () => {
      const mockResult: ListTenantsResult = {
        items: [createMockTenant('tenant-1', 'tenant-one')],
        total: 100,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 1,
        limit: 10,
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        {
          page: 1,
          limit: 10,
        },
      );
    });

    it('should handle large page numbers', async () => {
      const mockResult: ListTenantsResult = {
        items: [],
        total: 100,
      };
      mockTenantReadDao.findMany.mockResolvedValue(mockResult);

      const query: ListTenantsQuery = {
        page: 100,
        limit: 10,
      };

      await handler.execute(query);

      expect(mockTenantReadDao.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        {
          page: 100,
          limit: 10,
        },
      );
    });
  });
});
