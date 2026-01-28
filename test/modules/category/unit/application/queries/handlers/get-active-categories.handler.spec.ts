import { GetActiveCategoriesHandler } from '../../../../../../../src/modules/category/application/queries/handlers';
import { GetActiveCategoriesQuery } from '../../../../../../../src/modules/category/application/queries';
import { ICategoryReadDao } from '../../../../../../../src/modules/category/application/queries/ports';
import { CategoryResponseDto } from '../../../../../../../src/modules/category/application/dtos';

describe('GetActiveCategoriesHandler', () => {
  let handler: GetActiveCategoriesHandler;
  let mockCategoryReadDao: jest.Mocked<ICategoryReadDao>;

  beforeEach(() => {
    mockCategoryReadDao = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new GetActiveCategoriesHandler(mockCategoryReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockActiveCategory = (index: number): CategoryResponseDto => {
    return new CategoryResponseDto({
      id: `category-${index}`,
      tenantId: 'tenant-123',
      value: `ACTIVE_${index}`,
      label: `Active Category ${index}`,
      description: `Active description ${index}`,
      color: '#00FF00',
      icon: '✅',
      isActive: true,
      sortOrder: index,
      parentId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'admin-123',
      updatedBy: null,
    });
  };

  describe('execute', () => {
    it('should return all active categories', async () => {
      const mockCategories = [
        createMockActiveCategory(1),
        createMockActiveCategory(2),
        createMockActiveCategory(3),
      ];
      const query = new GetActiveCategoriesQuery('tenant-123');

      mockCategoryReadDao.findActive.mockResolvedValue(mockCategories);

      const result = await handler.execute(query);

      expect(result).toEqual(mockCategories);
      expect(result).toHaveLength(3);
      expect(result.every((cat) => cat.isActive)).toBe(true);
    });

    it('should call DAO with correct tenant ID', async () => {
      const query = new GetActiveCategoriesQuery('test-tenant-456');
      mockCategoryReadDao.findActive.mockResolvedValue([]);

      await handler.execute(query);

      expect(mockCategoryReadDao.findActive).toHaveBeenCalledWith(
        'test-tenant-456',
      );
      expect(mockCategoryReadDao.findActive).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no active categories exist', async () => {
      const query = new GetActiveCategoriesQuery('tenant-123');
      mockCategoryReadDao.findActive.mockResolvedValue([]);

      const result = await handler.execute(query);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return categories sorted by sortOrder and label', async () => {
      const category1 = createMockActiveCategory(1);
      const category2 = createMockActiveCategory(2);
      const category3 = createMockActiveCategory(3);

      const query = new GetActiveCategoriesQuery('tenant-123');
      mockCategoryReadDao.findActive.mockResolvedValue([
        category1,
        category2,
        category3,
      ]);

      const result = await handler.execute(query);

      expect(result[0].sortOrder).toBeLessThanOrEqual(result[1].sortOrder);
      expect(result[1].sortOrder).toBeLessThanOrEqual(result[2].sortOrder);
    });

    it('should only return categories for the specified tenant', async () => {
      const mockCategories = [
        createMockActiveCategory(1),
        createMockActiveCategory(2),
      ];
      const query = new GetActiveCategoriesQuery('tenant-123');

      mockCategoryReadDao.findActive.mockResolvedValue(mockCategories);

      const result = await handler.execute(query);

      expect(result.every((cat) => cat.tenantId === 'tenant-123')).toBe(true);
    });

    it('should propagate DAO errors', async () => {
      const query = new GetActiveCategoriesQuery('tenant-123');
      const daoError = new Error('Database connection failed');
      mockCategoryReadDao.findActive.mockRejectedValue(daoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
