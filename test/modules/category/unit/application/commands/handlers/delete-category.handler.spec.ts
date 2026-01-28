import { DeleteCategoryHandler } from '../../../../../../../src/modules/category/application/commands/handlers';
import { DeleteCategoryCommand } from '../../../../../../../src/modules/category/application/commands';
import { ICategoryRepository } from '../../../../../../../src/modules/category/domain/repositories';
import { Category, CategoryId } from '../../../../../../../src/modules/category/domain';
import { DomainException, NotFoundException } from '@core/common';

describe('DeleteCategoryHandler', () => {
  let handler: DeleteCategoryHandler;
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

    handler = new DeleteCategoryHandler(mockCategoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockCategory = (): Category => {
    const categoryId = CategoryId.generate();
    return Category.create(
      categoryId,
      {
        tenantId: 'tenant-123',
        value: 'EMERGENCY',
        label: 'Emergency Alerts',
        description: 'Critical notifications',
        color: '#FF0000',
        icon: '🚨',
        isActive: true,
        sortOrder: 10,
        parentId: null,
      },
      'admin-123',
    );
  };

  describe('execute', () => {
    it('should delete category successfully', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countChildren.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
      const deletedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(deletedCategory.isDeleted).toBe(true);
      expect(deletedCategory.deletedBy).toBe('admin-456');
      expect(deletedCategory.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const command = new DeleteCategoryCommand(
        'non-existent-id',
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Category');
    });

    it('should throw NotFoundException if category belongs to different tenant', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'different-tenant-999',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw DomainException if category has children', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countChildren.mockResolvedValue(3);

      await expect(handler.execute(command)).rejects.toThrow(DomainException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Cannot delete category with 3 child categories',
      );
    });

    it('should emit CategoryDeletedEvent when saving', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countChildren.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      const deletedCategory = mockCategoryRepository.save.mock.calls[0][0];
      const events = deletedCategory.getDomainEvents();

      expect(events.length).toBeGreaterThan(0);
      const deleteEvent = events.find((e) => e.eventType === 'CategoryDeleted');
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent?.aggregateType).toBe('Category');
    });

    it('should verify child count before deletion', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countChildren.mockResolvedValue(0);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      expect(mockCategoryRepository.countChildren).toHaveBeenCalledWith(
        mockCategory.id,
        'tenant-123',
      );
    });

    it('should propagate repository errors', async () => {
      const mockCategory = createMockCategory();
      const command = new DeleteCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.countChildren.mockResolvedValue(0);
      const repositoryError = new Error('Database connection failed');
      mockCategoryRepository.save.mockRejectedValue(repositoryError);

      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
