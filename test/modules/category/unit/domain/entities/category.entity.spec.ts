import { Category, CategoryId } from '../../../../../../src/modules/category/domain';
import { DomainException } from '@core/common';

describe('Category Entity', () => {
  describe('create', () => {
    it('should create a valid category', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
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

      expect(category.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(category.tenantId).toBe('tenant-123');
      expect(category.value).toBe('EMERGENCY');
      expect(category.label).toBe('Emergency Alerts');
      expect(category.description).toBe('Critical notifications');
      expect(category.color).toBe('#FF0000');
      expect(category.icon).toBe('🚨');
      expect(category.isActive).toBe(true);
      expect(category.sortOrder).toBe(10);
      expect(category.parentId).toBeNull();
      expect(category.version).toBe(1); // Version incremented when domain event added
      expect(category.createdBy).toBe('admin-123');
      expect(category.isDeleted).toBe(false);
    });

    it('should create category with minimal fields', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'SERVICES',
          label: 'Services',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );

      expect(category.value).toBe('SERVICES');
      expect(category.label).toBe('Services');
      expect(category.description).toBeUndefined();
      expect(category.color).toBeUndefined();
      expect(category.icon).toBeUndefined();
    });

    it('should throw DomainException when value is empty', () => {
      const categoryId = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId,
          {
            tenantId: 'tenant-123',
            value: '',
            label: 'Emergency Alerts',
            isActive: true,
            sortOrder: 10,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow(DomainException);
      const categoryId2 = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId2,
          {
            tenantId: 'tenant-123',
            value: '   ',
            label: 'Emergency Alerts',
            isActive: true,
            sortOrder: 10,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow('Category value is required');
    });

    it('should throw DomainException when label is empty', () => {
      const categoryId = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId,
          {
            tenantId: 'tenant-123',
            value: 'EMERGENCY',
            label: '',
            isActive: true,
            sortOrder: 10,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow('Category label is required');
    });

    it('should throw DomainException when value exceeds 50 characters', () => {
      const categoryId = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId,
          {
            tenantId: 'tenant-123',
            value: 'A'.repeat(51),
            label: 'Test',
            isActive: true,
            sortOrder: 10,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow('Category value must be 50 characters or less');
    });

    it('should throw DomainException when label exceeds 100 characters', () => {
      const categoryId = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId,
          {
            tenantId: 'tenant-123',
            value: 'TEST',
            label: 'A'.repeat(101),
            isActive: true,
            sortOrder: 10,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow('Category label must be 100 characters or less');
    });

    it('should throw DomainException when sortOrder is negative', () => {
      const categoryId = CategoryId.generate();
      expect(() => {
        Category.create(
          categoryId,
          {
            tenantId: 'tenant-123',
            value: 'EMERGENCY',
            label: 'Emergency',
            isActive: true,
            sortOrder: -1,
            parentId: null,
          },
          'admin-123',
        );
      }).toThrow('Sort order must be non-negative');
    });

    it('should emit CategoryCreatedEvent', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'EMERGENCY',
          label: 'Emergency Alerts',
          isActive: true,
          sortOrder: 10,
          parentId: null,
        },
        'admin-123',
      );

      const events = category.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CategoryCreated');
      expect(events[0].aggregateType).toBe('Category');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        value: 'EMERGENCY',
        label: 'Emergency Alerts',
        createdBy: 'admin-123',
      });
    });
  });

  describe('update', () => {
    let category: Category;

    beforeEach(() => {
      const categoryId = CategoryId.generate();
      category = Category.create(
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
      category.clearDomainEvents(); // Clear creation event
    });

    it('should update label', () => {
      category.update({ label: 'Updated Label' }, 'admin-456');

      expect(category.label).toBe('Updated Label');
      expect(category.updatedBy).toBe('admin-456');
    });

    it('should update multiple fields', () => {
      category.update(
        {
          label: 'New Label',
          description: 'New description',
          color: '#00FF00',
          icon: '⚠️',
          isActive: false,
          sortOrder: 20,
        },
        'admin-456',
      );

      expect(category.label).toBe('New Label');
      expect(category.description).toBe('New description');
      expect(category.color).toBe('#00FF00');
      expect(category.icon).toBe('⚠️');
      expect(category.isActive).toBe(false);
      expect(category.sortOrder).toBe(20);
    });

    it('should not change value (immutable)', () => {
      const originalValue = category.value;
      category.update({ label: 'New Label' }, 'admin-456');

      expect(category.value).toBe(originalValue);
    });

    it('should throw DomainException when updating label to empty', () => {
      expect(() => {
        category.update({ label: '' }, 'admin-456');
      }).toThrow('Category label cannot be empty');
    });

    it('should throw DomainException when updating label exceeds 100 characters', () => {
      expect(() => {
        category.update({ label: 'A'.repeat(101) }, 'admin-456');
      }).toThrow('Category label must be 100 characters or less');
    });

    it('should throw DomainException when updating sortOrder to negative', () => {
      expect(() => {
        category.update({ sortOrder: -5 }, 'admin-456');
      }).toThrow('Sort order must be non-negative');
    });

    it('should emit CategoryUpdatedEvent', () => {
      category.update({ label: 'Updated Label' }, 'admin-456');

      const events = category.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CategoryUpdated');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        label: 'Updated Label',
        updatedBy: 'admin-456',
      });
    });
  });

  describe('activate', () => {
    it('should activate an inactive category', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: false,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.activate('admin-456');

      expect(category.isActive).toBe(true);
      expect(category.updatedBy).toBe('admin-456');
    });

    it('should be no-op when already active', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.activate('admin-456');

      const events = category.getDomainEvents();
      expect(events).toHaveLength(0); // No event emitted for no-op
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active category', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.deactivate('admin-456');

      expect(category.isActive).toBe(false);
      expect(category.updatedBy).toBe('admin-456');
    });

    it('should be no-op when already inactive', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: false,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.deactivate('admin-456');

      const events = category.getDomainEvents();
      expect(events).toHaveLength(0); // No event emitted for no-op
    });
  });

  describe('markAsDeleted', () => {
    it('should mark category as deleted', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.markAsDeleted('admin-456');

      expect(category.isDeleted).toBe(true);
      expect(category.deletedBy).toBe('admin-456');
      expect(category.deletedAt).toBeInstanceOf(Date);
    });

    it('should emit CategoryDeletedEvent', () => {
      const categoryId = CategoryId.generate();
      const category = Category.create(
        categoryId,
        {
          tenantId: 'tenant-123',
          value: 'TEST',
          label: 'Test',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
        'admin-123',
      );
      category.clearDomainEvents();

      category.markAsDeleted('admin-456');

      const events = category.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('CategoryDeleted');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        value: 'TEST',
        deletedBy: 'admin-456',
      });
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute category from database props', () => {
      const dbProps = {
        id: 'test-id-123',
        tenantId: 'tenant-123',
        value: 'EMERGENCY',
        label: 'Emergency Alerts',
        description: 'Critical notifications',
        color: '#FF0000',
        icon: '🚨',
        isActive: true,
        sortOrder: 10,
        parentId: null,
        version: 5,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdBy: 'admin-123',
        updatedBy: 'admin-456',
      };

      const category = Category.reconstitute(dbProps);

      expect(category.id).toBe('test-id-123');
      expect(category.tenantId).toBe('tenant-123');
      expect(category.value).toBe('EMERGENCY');
      expect(category.label).toBe('Emergency Alerts');
      expect(category.version).toBe(5);
      expect(category.createdBy).toBe('admin-123');
      expect(category.updatedBy).toBe('admin-456');
      expect(category.createdAt).toEqual(new Date('2026-01-01'));
      expect(category.updatedAt).toEqual(new Date('2026-01-15'));
    });

    it('should not emit events when reconstituting', () => {
      const dbProps = {
        id: 'test-id-123',
        tenantId: 'tenant-123',
        value: 'TEST',
        label: 'Test',
        isActive: true,
        sortOrder: 0,
        parentId: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdBy: 'admin-123',
        updatedBy: null,
      };

      const category = Category.reconstitute(dbProps);
      const events = category.getDomainEvents();

      expect(events).toHaveLength(0);
    });
  });
});
