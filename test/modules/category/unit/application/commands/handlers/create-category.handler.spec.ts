import { CreateCategoryHandler } from '../../../../../../../src/modules/category/application/commands/handlers';
import { CreateCategoryCommand } from '../../../../../../../src/modules/category/application/commands';
import { ICategoryRepository } from '../../../../../../../src/modules/category/domain/repositories';
import { ConflictException, NotFoundException } from '@core/common';

describe('CreateCategoryHandler', () => {
  let handler: CreateCategoryHandler;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;

  beforeEach(() => {
    mockCategoryRepository = {
      save: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      findByValue: jest.fn(),
      findByParentId: jest.fn(),
      existsByValue: jest.fn(),
      countChildren: jest.fn(),
    } as any;

    handler = new CreateCategoryHandler(mockCategoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validCommand: CreateCategoryCommand = new CreateCategoryCommand(
    'tenant-123',
    'EMERGENCY',
    'Emergency Alerts',
    'Critical emergency notifications',
    '#FF0000',
    '🚨',
    10,
    null,
    'admin-123',
  );

  describe('execute', () => {
    it('should create category with valid data', async () => {
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      const result = await handler.execute(validCommand);

      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID format
    });

    it('should call repository.save with category aggregate', async () => {
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
      const savedCategory = mockCategoryRepository.save.mock.calls[0][0];

      expect(savedCategory.tenantId).toBe('tenant-123');
      expect(savedCategory.value).toBe('EMERGENCY');
      expect(savedCategory.label).toBe('Emergency Alerts');
      expect(savedCategory.description).toBe(
        'Critical emergency notifications',
      );
      expect(savedCategory.color).toBe('#FF0000');
      expect(savedCategory.icon).toBe('🚨');
      expect(savedCategory.sortOrder).toBe(10);
      expect(savedCategory.parentId).toBeNull();
      expect(savedCategory.isActive).toBe(true);
    });

    it('should create category with minimal required fields', async () => {
      const minimalCommand = new CreateCategoryCommand(
        'tenant-123',
        'SERVICES',
        'Services',
        undefined,
        undefined,
        undefined,
        0,
        null,
        'admin-123',
      );

      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(minimalCommand);

      const savedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(savedCategory.description).toBeUndefined();
      expect(savedCategory.color).toBeUndefined();
      expect(savedCategory.icon).toBeUndefined();
      expect(savedCategory.sortOrder).toBe(0);
    });

    it('should create category with parent', async () => {
      const parentCommand = new CreateCategoryCommand(
        'tenant-123',
        'SUBCATEGORY',
        'Sub Category',
        undefined,
        undefined,
        undefined,
        20,
        'parent-id-123',
        'admin-123',
      );

      const mockParentCategory = {
        id: 'parent-id-123',
        tenantId: 'tenant-123',
      };
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.getById.mockResolvedValue(
        mockParentCategory as any,
      );
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(parentCommand);

      const savedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(savedCategory.parentId).toBe('parent-id-123');
    });

    it('should throw ConflictException if category value already exists', async () => {
      const existingCategory = {
        id: 'existing-id',
        value: 'EMERGENCY',
        tenantId: 'tenant-123',
      };
      mockCategoryRepository.findByValue.mockResolvedValue(
        existingCategory as any,
      );

      await expect(handler.execute(validCommand)).rejects.toThrow(
        ConflictException,
      );
      await expect(handler.execute(validCommand)).rejects.toThrow(
        "Category with value 'EMERGENCY' already exists",
      );
    });

    it('should throw NotFoundException if parent category does not exist', async () => {
      const commandWithParent = new CreateCategoryCommand(
        'tenant-123',
        'SUBCATEGORY',
        'Sub Category',
        undefined,
        undefined,
        undefined,
        20,
        'non-existent-parent',
        'admin-123',
      );

      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(commandWithParent)).rejects.toThrow(
        NotFoundException,
      );
      await expect(handler.execute(commandWithParent)).rejects.toThrow(
        'Parent category',
      );
    });

    it('should throw NotFoundException if parent category belongs to different tenant', async () => {
      const commandWithParent = new CreateCategoryCommand(
        'tenant-123',
        'SUBCATEGORY',
        'Sub Category',
        undefined,
        undefined,
        undefined,
        20,
        'parent-id-456',
        'admin-123',
      );

      const mockParentCategory = {
        id: 'parent-id-456',
        tenantId: 'tenant-999',
      };
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.getById.mockResolvedValue(
        mockParentCategory as any,
      );

      await expect(handler.execute(commandWithParent)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should emit CategoryCreatedEvent when saving', async () => {
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(validCommand);

      const savedCategory = mockCategoryRepository.save.mock.calls[0][0];
      const events = savedCategory.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CategoryCreated');
      expect(events[0].aggregateType).toBe('Category');
    });

    it('should propagate repository errors', async () => {
      mockCategoryRepository.findByValue.mockResolvedValue(null);
      const repositoryError = new Error('Database connection failed');
      mockCategoryRepository.save.mockRejectedValue(repositoryError);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
