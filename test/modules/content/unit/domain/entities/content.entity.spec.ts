import { Content } from '../../../../../../src/modules/content/domain/entities';
import { ContentType, ContentStatus, ContentPriority } from '../../../../../../src/modules/content/domain/value-objects';
import { DomainException } from '@core/domain';

describe('Content Entity', () => {
  const createValidProps = (): Omit<Parameters<typeof Content.create>[0], 'id'> => ({
    tenantId: 'tenant-123',
    authorId: 'author-123',
    title: 'Test Content Title',
    content: 'This is test content body with enough text to be valid.',
    excerpt: 'Short excerpt',
    type: ContentType.article(),
    priority: ContentPriority.medium(),
    categoryId: 'category-123',
    tags: ['tag1', 'tag2'],
    featuredImage: 'https://example.com/image.jpg',
  });

  describe('create', () => {
    it('should create a valid content with all properties', () => {
      const props = createValidProps();

      const content = Content.create({ id: 'content-123', ...props });

      expect(content.id).toBe('content-123');
      expect(content.tenantId).toBe('tenant-123');
      expect(content.authorId).toBe('author-123');
      expect(content.title).toBe('Test Content Title');
      expect(content.content).toBe('This is test content body with enough text to be valid.');
      expect(content.excerpt).toBe('Short excerpt');
      expect(content.type.toString()).toBe('ARTICLE');
      expect(content.status.toString()).toBe('DRAFT');
      expect(content.priority.toString()).toBe('MEDIUM');
      expect(content.categoryId).toBe('category-123');
      expect(content.tags).toEqual(['tag1', 'tag2']);
      expect(content.featuredImage).toBe('https://example.com/image.jpg');
    });

    it('should create content with default priority MEDIUM', () => {
      const props = { ...createValidProps(), priority: undefined };

      const content = Content.create({ id: 'content-123', ...props });

      expect(content.priority.toString()).toBe('MEDIUM');
    });

    it('should create content without optional fields', () => {
      const props = {
        tenantId: 'tenant-123',
        authorId: 'author-123',
        title: 'Test Title',
        content: 'Test content body',
        type: ContentType.news(),
      };

      const content = Content.create({ id: 'content-123', ...props });

      expect(content.excerpt).toBeNull();
      expect(content.categoryId).toBeNull();
      expect(content.tags).toEqual([]);
      expect(content.featuredImage).toBeNull();
    });

    it('should emit ContentCreatedEvent', () => {
      const props = createValidProps();

      const content = Content.create({ id: 'content-123', ...props });
      const events = content.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ContentCreated');
      expect(events[0].aggregateId).toBe('content-123');
      expect(events[0].data).toMatchObject({
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
        title: 'Test Content Title',
        type: 'ARTICLE',
        status: 'DRAFT',
      });
    });

    it('should start with DRAFT status', () => {
      const props = createValidProps();

      const content = Content.create({ id: 'content-123', ...props });

      expect(content.status.isDraft()).toBe(true);
      expect(content.canEdit()).toBe(true);
    });

    // Validation tests
    it('should throw DomainException for empty title', () => {
      const props = { ...createValidProps(), title: '' };

      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(DomainException);
      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(
        'Content title is required'
      );
    });

    it('should throw DomainException for title exceeding 200 characters', () => {
      const props = { ...createValidProps(), title: 'a'.repeat(201) };

      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(DomainException);
      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(
        'Content title cannot exceed 200 characters'
      );
    });

    it('should throw DomainException for empty content body', () => {
      const props = { ...createValidProps(), content: '' };

      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(DomainException);
      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(
        'Content body is required'
      );
    });

    it('should throw DomainException for content body exceeding 10000 characters', () => {
      const props = { ...createValidProps(), content: 'a'.repeat(10001) };

      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(DomainException);
      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(
        'Content body cannot exceed 10000 characters'
      );
    });

    it('should throw DomainException for excerpt exceeding 500 characters', () => {
      const props = { ...createValidProps(), excerpt: 'a'.repeat(501) };

      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(DomainException);
      expect(() => Content.create({ id: 'content-123', ...props })).toThrow(
        'Content excerpt cannot exceed 500 characters'
      );
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute content from database without emitting events', () => {
      const content = Content.reconstitute({
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
        title: 'Reconstituted Content',
        content: 'Content body',
        excerpt: 'Excerpt',
        type: ContentType.news(),
        status: ContentStatus.draft(),
        priority: ContentPriority.high(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      expect(content.id).toBe('content-123');
      expect(content.version).toBe(5);
      expect(content.getDomainEvents()).toHaveLength(0); // No events emitted
    });
  });

  describe('canEdit', () => {
    it('should return true for DRAFT status', () => {
      const props = createValidProps();
      const content = Content.create({ id: 'content-123', ...props });

      expect(content.canEdit()).toBe(true);
    });
  });
});
