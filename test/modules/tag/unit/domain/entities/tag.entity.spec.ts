import { Tag, TagId, TagCategory } from '../../../../../../src/modules/tag/domain';
import { DomainException } from '@core/common';

describe('Tag Entity', () => {
  describe('create', () => {
    it('should create a valid tag', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Emergency',
          slug: 'emergency',
          description: 'Critical notifications',
          color: '#FF0000',
          category: TagCategory.EMERGENCY,
          synonyms: ['urgent', 'critical'],
          isActive: true,
          usageCount: 0,
          metadata: { priority: 'high' },
        },
        'admin-123',
      );

      expect(tag.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(tag.tenantId).toBe('tenant-123');
      expect(tag.name).toBe('Emergency');
      expect(tag.slug).toBe('emergency');
      expect(tag.description).toBe('Critical notifications');
      expect(tag.color).toBe('#FF0000');
      expect(tag.category).toBe(TagCategory.EMERGENCY);
      expect(tag.synonyms).toEqual(['urgent', 'critical']);
      expect(tag.usageCount).toBe(0);
      expect(tag.metadata).toEqual({ priority: 'high' });
      expect(tag.isActive).toBe(true);
      expect(tag.version).toBe(1); // Version incremented when domain event added
      expect(tag.createdBy).toBe('admin-123');
      expect(tag.isDeleted).toBe(false);
    });

    it('should create tag with minimal fields', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Services',
          slug: 'services',
          category: TagCategory.SERVICES,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );

      expect(tag.name).toBe('Services');
      expect(tag.slug).toBe('services');
      expect(tag.category).toBe(TagCategory.SERVICES);
      expect(tag.synonyms).toEqual([]);
      expect(tag.usageCount).toBe(0);
      expect(tag.description).toBeUndefined();
      expect(tag.color).toBeUndefined();
      expect(tag.metadata).toBeUndefined();
    });

    it('should auto-generate slug from name', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Emergency Alert',
          slug: 'emergency-alert', // Will be overridden
          category: TagCategory.EMERGENCY,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );

      expect(tag.slug).toBe('emergency-alert');
    });

    it('should throw DomainException when name is empty', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: '',
            slug: 'test',
            category: TagCategory.GENERAL,
            synonyms: [],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow(DomainException);
      const tagId2 = TagId.generate();
      expect(() => {
        Tag.create(
          tagId2,
          {
            tenantId: 'tenant-123',
            name: '   ',
            slug: 'test',
            category: TagCategory.GENERAL,
            synonyms: [],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow('Tag name is required');
    });

    it('should throw DomainException when name exceeds 100 characters', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: 'A'.repeat(101),
            slug: 'test',
            category: TagCategory.GENERAL,
            synonyms: [],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow('Tag name must be 100 characters or less');
    });

    it('should throw DomainException when color is invalid', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: 'Test',
            slug: 'test',
            color: 'invalid',
            category: TagCategory.GENERAL,
            synonyms: [],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow('Color must be a valid hex code');
    });

    it('should throw DomainException when category is invalid', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: 'Test',
            slug: 'test',
            category: 'INVALID' as TagCategory,
            synonyms: [],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow('Category must be one of');
    });

    it('should throw DomainException when synonym exceeds 255 characters', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: 'Test',
            slug: 'test',
            category: TagCategory.GENERAL,
            synonyms: ['A'.repeat(256)],
            isActive: true,
            usageCount: 0,
          },
          'admin-123',
        );
      }).toThrow('Synonym must be 255 characters or less');
    });

    it('should throw DomainException when usageCount is negative', () => {
      const tagId = TagId.generate();
      expect(() => {
        Tag.create(
          tagId,
          {
            tenantId: 'tenant-123',
            name: 'Test',
            slug: 'test',
            category: TagCategory.GENERAL,
            synonyms: [],
            isActive: true,
            usageCount: -1,
          },
          'admin-123',
        );
      }).toThrow('Usage count cannot be negative');
    });

    it('should emit TagCreatedEvent', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Emergency',
          slug: 'emergency',
          category: TagCategory.EMERGENCY,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TagCreated');
      expect(events[0].aggregateType).toBe('Tag');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        name: 'Emergency',
        slug: 'emergency',
        category: TagCategory.EMERGENCY,
      });
    });
  });

  describe('update', () => {
    let tag: Tag;

    beforeEach(() => {
      const tagId = TagId.generate();
      tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Emergency',
          slug: 'emergency',
          description: 'Critical notifications',
          color: '#FF0000',
          category: TagCategory.EMERGENCY,
          synonyms: ['urgent'],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents(); // Clear creation event
    });

    it('should update name', () => {
      tag.update({ name: 'Updated Name' }, 'admin-456');

      expect(tag.name).toBe('Updated Name');
      expect(tag.updatedBy).toBe('admin-456');
    });

    it('should update multiple fields', () => {
      tag.update(
        {
          name: 'New Name',
          description: 'New description',
          color: '#00FF00',
          category: TagCategory.SERVICES,
          synonyms: ['important', 'critical'],
          isActive: false,
          metadata: { updated: true },
        },
        'admin-456',
      );

      expect(tag.name).toBe('New Name');
      expect(tag.description).toBe('New description');
      expect(tag.color).toBe('#00FF00');
      expect(tag.category).toBe(TagCategory.SERVICES);
      expect(tag.synonyms).toEqual(['important', 'critical']);
      expect(tag.isActive).toBe(false);
      expect(tag.metadata).toEqual({ updated: true });
    });

    it('should not change slug (immutable)', () => {
      const originalSlug = tag.slug;
      tag.update({ name: 'New Name' }, 'admin-456');

      expect(tag.slug).toBe(originalSlug);
    });

    it('should throw DomainException when updating name to empty', () => {
      expect(() => {
        tag.update({ name: '' }, 'admin-456');
      }).toThrow('Tag name cannot be empty');
    });

    it('should throw DomainException when updating name exceeds 100 characters', () => {
      expect(() => {
        tag.update({ name: 'A'.repeat(101) }, 'admin-456');
      }).toThrow('Tag name must be 100 characters or less');
    });

    it('should throw DomainException when updating color is invalid', () => {
      expect(() => {
        tag.update({ color: 'invalid' }, 'admin-456');
      }).toThrow('Color must be a valid hex code');
    });

    it('should emit TagUpdatedEvent', () => {
      tag.update({ name: 'Updated Name' }, 'admin-456');

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TagUpdated');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        name: 'Updated Name',
      });
    });
  });

  describe('activate', () => {
    it('should activate an inactive tag', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: false,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.activate('admin-456');

      expect(tag.isActive).toBe(true);
      expect(tag.updatedBy).toBe('admin-456');
    });

    it('should be no-op when already active', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.activate('admin-456');

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(0); // No event emitted for no-op
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active tag', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.deactivate('admin-456');

      expect(tag.isActive).toBe(false);
      expect(tag.updatedBy).toBe('admin-456');
    });

    it('should be no-op when already inactive', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: false,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.deactivate('admin-456');

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(0); // No event emitted for no-op
    });
  });

  describe('markAsDeleted', () => {
    it('should mark tag as deleted', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.markAsDeleted('admin-456');

      expect(tag.isDeleted).toBe(true);
      expect(tag.deletedBy).toBe('admin-456');
      expect(tag.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw DomainException when deleting tag with usage count > 0', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 5,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      expect(() => {
        tag.markAsDeleted('admin-456', false);
      }).toThrow('Cannot delete tag with usage count 5');
    });

    it('should allow force delete tag with usage count > 0', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 5,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.markAsDeleted('admin-456', true);

      expect(tag.isDeleted).toBe(true);
      expect(tag.deletedBy).toBe('admin-456');
    });

    it('should emit TagDeletedEvent', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.markAsDeleted('admin-456');

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TagDeleted');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        slug: 'test',
        usageCount: 0,
      });
    });
  });

  describe('recordUsage', () => {
    it('should increment usage count', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.recordUsage('content-123');

      expect(tag.usageCount).toBe(1);
    });

    it('should emit TagUsedEvent', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.clearDomainEvents();

      tag.recordUsage('content-123');

      const events = tag.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TagUsed');
      expect(events[0].data).toMatchObject({
        tenantId: 'tenant-123',
        contentId: 'content-123',
        usageCount: 1,
      });
    });

    it('should throw when recording usage on deleted tag', () => {
      const tagId = TagId.generate();
      const tag = Tag.create(
        tagId,
        {
          tenantId: 'tenant-123',
          name: 'Test',
          slug: 'test',
          category: TagCategory.GENERAL,
          synonyms: [],
          isActive: true,
          usageCount: 0,
        },
        'admin-123',
      );
      tag.markAsDeleted('admin-123', true);

      expect(() => {
        tag.recordUsage('content-123');
      }).toThrow('Cannot modify deleted tag');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute tag from database props', () => {
      const dbProps = {
        id: 'test-id-123',
        tenantId: 'tenant-123',
        name: 'Emergency',
        slug: 'emergency',
        description: 'Critical notifications',
        color: '#FF0000',
        category: TagCategory.EMERGENCY,
        synonyms: ['urgent', 'critical'],
        isActive: true,
        usageCount: 10,
        metadata: { priority: 'high' },
        version: 5,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdBy: 'admin-123',
        updatedBy: 'admin-456',
      };

      const tag = Tag.reconstitute(dbProps);

      expect(tag.id).toBe('test-id-123');
      expect(tag.tenantId).toBe('tenant-123');
      expect(tag.name).toBe('Emergency');
      expect(tag.slug).toBe('emergency');
      expect(tag.category).toBe(TagCategory.EMERGENCY);
      expect(tag.synonyms).toEqual(['urgent', 'critical']);
      expect(tag.usageCount).toBe(10);
      expect(tag.metadata).toEqual({ priority: 'high' });
      expect(tag.version).toBe(5);
      expect(tag.createdBy).toBe('admin-123');
      expect(tag.updatedBy).toBe('admin-456');
      expect(tag.createdAt).toEqual(new Date('2026-01-01'));
      expect(tag.updatedAt).toEqual(new Date('2026-01-15'));
    });

    it('should not emit events when reconstituting', () => {
      const dbProps = {
        id: 'test-id-123',
        tenantId: 'tenant-123',
        name: 'Test',
        slug: 'test',
        category: TagCategory.GENERAL,
        synonyms: [],
        isActive: true,
        usageCount: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdBy: 'admin-123',
        updatedBy: null,
      };

      const tag = Tag.reconstitute(dbProps);
      const events = tag.getDomainEvents();

      expect(events).toHaveLength(0);
    });
  });
});
