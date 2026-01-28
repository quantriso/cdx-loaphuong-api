import { UpdateCategoryHandler } from '../../../../../../../src/modules/category/application/commands/handlers';
import { UpdateCategoryCommand } from '../../../../../../../src/modules/category/application/commands';
import { ICategoryRepository } from '../../../../../../../src/modules/category/domain/repositories';
import { Category, CategoryId } from '../../../../../../../src/modules/category/domain';
import { NotFoundException } from '@core/common';

describe('UpdateCategoryHandler', () => {
  let handler: UpdateCategoryHandler;
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

    handler = new UpdateCategoryHandler(mockCategoryRepository);
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
    it('should update category label', async () => {
      const mockCategory = createMockCategory();
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'Updated Emergency Alerts',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
      const updatedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(updatedCategory.label).toBe('Updated Emergency Alerts');
    });

    it('should update multiple fields at once', async () => {
      const mockCategory = createMockCategory();
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'New Label',
        'New description',
        '#00FF00',
        '⚠️',
        false,
        20,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      const updatedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(updatedCategory.label).toBe('New Label');
      expect(updatedCategory.description).toBe('New description');
      expect(updatedCategory.color).toBe('#00FF00');
      expect(updatedCategory.icon).toBe('⚠️');
      expect(updatedCategory.isActive).toBe(false);
      expect(updatedCategory.sortOrder).toBe(20);
    });

    it('should update only provided fields', async () => {
      const mockCategory = createMockCategory();
      const originalColor = mockCategory.color;
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'Updated Label Only',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      const updatedCategory = mockCategoryRepository.save.mock.calls[0][0];
      expect(updatedCategory.label).toBe('Updated Label Only');
      expect(updatedCategory.color).toBe(originalColor); // Unchanged
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const command = new UpdateCategoryCommand(
        'non-existent-id',
        'tenant-123',
        'New Label',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Category');
    });

    it('should throw NotFoundException if category belongs to different tenant', async () => {
      const mockCategory = createMockCategory();
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'different-tenant-999',
        'New Label',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should emit CategoryUpdatedEvent when saving', async () => {
      const mockCategory = createMockCategory();
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'Updated Label',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      mockCategoryRepository.save.mockImplementation(
        async (category) => category,
      );

      await handler.execute(command);

      const updatedCategory = mockCategoryRepository.save.mock.calls[0][0];
      const events = updatedCategory.getDomainEvents();

      expect(events.length).toBeGreaterThan(0);
      const updateEvent = events.find((e) => e.eventType === 'CategoryUpdated');
      expect(updateEvent).toBeDefined();
      expect(updateEvent?.aggregateType).toBe('Category');
    });

    it('should propagate repository errors', async () => {
      const mockCategory = createMockCategory();
      const command = new UpdateCategoryCommand(
        mockCategory.id,
        'tenant-123',
        'New Label',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'admin-456',
      );

      mockCategoryRepository.getById.mockResolvedValue(mockCategory);
      const repositoryError = new Error('Database connection failed');
      mockCategoryRepository.save.mockRejectedValue(repositoryError);

      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
