import { InitializeDefaultCategoriesHandler } from './initialize-default-categories.handler';
import { InitializeDefaultCategoriesCommand } from '../initialize-default-categories.command';
import { ICategoryRepository } from 'src/modules/category/domain/repositories';
import { ConflictException } from '@core/common';
import { DEFAULT_CATEGORIES_COUNT } from 'src/modules/category/constants';

describe('InitializeDefaultCategoriesHandler', () => {
  let handler: InitializeDefaultCategoriesHandler;
  let mockCategoryRepository: jest.Mocked<Pick<
    ICategoryRepository,
    'countByTenantId' | 'save'
  >>;

  beforeEach(() => {
    mockCategoryRepository = {
      countByTenantId: jest.fn(),
      save: jest.fn(),
    };

    handler = new InitializeDefaultCategoriesHandler(
      mockCategoryRepository as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validCommand = new InitializeDefaultCategoriesCommand('tenant-123');

  describe('successful initialization', () => {
    it('should create all default categories for tenant', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      expect(mockCategoryRepository.countByTenantId).toHaveBeenCalledWith(
        'tenant-123',
      );
      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(
        DEFAULT_CATEGORIES_COUNT,
      );
    });

    it('should create categories with correct values', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategories = mockCategoryRepository.save.mock.calls.map(
        (call) => call[0],
      );

      const expectedValues = [
        'EMERGENCY',
        'SERVICES',
        'EVENTS',
        'POLICY',
        'HEALTH',
        'EDUCATION',
        'INFRASTRUCTURE',
        'GENERAL',
        'OTHER',
      ];

      const actualValues = savedCategories.map((cat) => cat.value);
      expect(actualValues).toEqual(expectedValues);
    });

    it('should create categories with correct tenantId', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategories = mockCategoryRepository.save.mock.calls.map(
        (call) => call[0],
      );

      savedCategories.forEach((category) => {
        expect(category.tenantId).toBe('tenant-123');
      });
    });

    it('should create categories with correct properties', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategories = mockCategoryRepository.save.mock.calls.map(
        (call) => call[0],
      );

      savedCategories.forEach((category) => {
        expect(category.parentId).toBeNull();
        expect(category.isActive).toBe(true);
        expect(category.createdBy).toBe('SYSTEM');
      });
    });

    it('should create categories with sequential sortOrder', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategories = mockCategoryRepository.save.mock.calls.map(
        (call) => call[0],
      );

      const sortOrders = savedCategories.map((cat) => cat.sortOrder);
      expect(sortOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('event emission', () => {
    it('should emit CategoryCreatedEvent for each category', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategories = mockCategoryRepository.save.mock.calls.map(
        (call) => call[0],
      );

      savedCategories.forEach((category) => {
        const events = category.getDomainEvents();
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].eventType).toBe('CategoryCreated');
        expect(events[0].aggregateType).toBe('Category');
      });
    });
  });

  describe('validation', () => {
    it('should throw ConflictException if categories already exist', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(5);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        ConflictException,
      );
      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Categories already initialized for this tenant',
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate repository save errors', async () => {
      mockCategoryRepository.countByTenantId.mockResolvedValue(0);
      const repositoryError = new Error('Database connection failed');
      mockCategoryRepository.save.mockRejectedValue(repositoryError);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate count errors', async () => {
      const countError = new Error('Count query failed');
      mockCategoryRepository.countByTenantId.mockRejectedValue(countError);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Count query failed',
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });
  });
});
