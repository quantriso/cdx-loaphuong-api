import { GetCategoryHandler } from '../../../../../../../src/modules/category/application/queries/handlers';
import { GetCategoryQuery } from '../../../../../../../src/modules/category/application/queries';
import { ICategoryReadDao } from '../../../../../../../src/modules/category/application/queries/ports';
import { CategoryResponseDto } from '../../../../../../../src/modules/category/application/dtos';
import { NotFoundException } from '@core/common';

describe('GetCategoryHandler', () => {
  let handler: GetCategoryHandler;
  let mockCategoryReadDao: jest.Mocked<ICategoryReadDao>;

  beforeEach(() => {
    mockCategoryReadDao = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new GetCategoryHandler(mockCategoryReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockCategoryDto: CategoryResponseDto = new CategoryResponseDto({
    id: 'category-123',
    tenantId: 'tenant-123',
    value: 'EMERGENCY',
    label: 'Emergency Alerts',
    description: 'Critical notifications',
    color: '#FF0000',
    icon: '🚨',
    isActive: true,
    sortOrder: 10,
    parentId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-123',
    updatedBy: null,
  });

  describe('execute', () => {
    it('should return category when found', async () => {
      const query = new GetCategoryQuery('category-123', 'tenant-123');
      mockCategoryReadDao.findById.mockResolvedValue(mockCategoryDto);

      const result = await handler.execute(query);

      expect(result).toEqual(mockCategoryDto);
      expect(mockCategoryReadDao.findById).toHaveBeenCalledWith(
        'category-123',
        'tenant-123',
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      const query = new GetCategoryQuery('non-existent', 'tenant-123');
      mockCategoryReadDao.findById.mockResolvedValue(null);

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Category');
    });

    it('should call DAO with correct parameters', async () => {
      const query = new GetCategoryQuery('test-id', 'test-tenant');
      mockCategoryReadDao.findById.mockResolvedValue(mockCategoryDto);

      await handler.execute(query);

      expect(mockCategoryReadDao.findById).toHaveBeenCalledWith(
        'test-id',
        'test-tenant',
      );
      expect(mockCategoryReadDao.findById).toHaveBeenCalledTimes(1);
    });

    it('should propagate DAO errors', async () => {
      const query = new GetCategoryQuery('category-123', 'tenant-123');
      const daoError = new Error('Database connection failed');
      mockCategoryReadDao.findById.mockRejectedValue(daoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
