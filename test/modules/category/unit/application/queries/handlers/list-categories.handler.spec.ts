import { ListCategoriesHandler } from '../../../../../../../src/modules/category/application/queries/handlers';
import { ListCategoriesQuery } from '../../../../../../../src/modules/category/application/queries';
import { ICategoryReadDao } from '../../../../../../../src/modules/category/application/queries/ports';
import { CategoryResponseDto } from '../../../../../../../src/modules/category/application/dtos';

describe('ListCategoriesHandler', () => {
  let handler: ListCategoriesHandler;
  let mockCategoryReadDao: jest.Mocked<ICategoryReadDao>;

  beforeEach(() => {
    mockCategoryReadDao = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findActive: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new ListCategoriesHandler(mockCategoryReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockCategory = (index: number): CategoryResponseDto => {
    return new CategoryResponseDto({
      id: `category-${index}`,
      tenantId: 'tenant-123',
      value: `VALUE_${index}`,
      label: `Category ${index}`,
      description: `Description ${index}`,
      color: '#FF0000',
      icon: '🚨',
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
    it('should return paginated categories list', async () => {
      const mockCategories = [createMockCategory(1), createMockCategory(2)];
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        undefined,
        1,
        50,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: mockCategories,
        total: 2,
      });

      const result = await handler.execute(query);

      expect(result.data).toEqual(mockCategories);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by isActive', async () => {
      const mockCategories = [createMockCategory(1)];
      const query = new ListCategoriesQuery(
        'tenant-123',
        true,
        undefined,
        1,
        50,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: mockCategories,
        total: 1,
      });

      await handler.execute(query);

      expect(mockCategoryReadDao.findAll).toHaveBeenCalledWith(
        'tenant-123',
        true,
        undefined,
        1,
        50,
      );
    });

    it('should filter by parentId', async () => {
      const mockCategories = [createMockCategory(1)];
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        'parent-123',
        1,
        50,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: mockCategories,
        total: 1,
      });

      await handler.execute(query);

      expect(mockCategoryReadDao.findAll).toHaveBeenCalledWith(
        'tenant-123',
        undefined,
        'parent-123',
        1,
        50,
      );
    });

    it('should filter by null parentId (root categories)', async () => {
      const mockCategories = [createMockCategory(1)];
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        null,
        1,
        50,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: mockCategories,
        total: 1,
      });

      await handler.execute(query);

      expect(mockCategoryReadDao.findAll).toHaveBeenCalledWith(
        'tenant-123',
        undefined,
        null,
        1,
        50,
      );
    });

    it('should handle custom pagination', async () => {
      const mockCategories = [createMockCategory(1)];
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        undefined,
        2,
        25,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: mockCategories,
        total: 50,
      });

      const result = await handler.execute(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(mockCategoryReadDao.findAll).toHaveBeenCalledWith(
        'tenant-123',
        undefined,
        undefined,
        2,
        25,
      );
    });

    it('should return empty list when no categories found', async () => {
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        undefined,
        1,
        50,
      );

      mockCategoryReadDao.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await handler.execute(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should propagate DAO errors', async () => {
      const query = new ListCategoriesQuery(
        'tenant-123',
        undefined,
        undefined,
        1,
        50,
      );
      const daoError = new Error('Database connection failed');
      mockCategoryReadDao.findAll.mockRejectedValue(daoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
