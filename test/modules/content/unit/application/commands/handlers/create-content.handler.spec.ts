import { CreateContentHandler } from '../../../../../../../src/modules/content/application/commands/handlers';
import { CreateContentCommand } from '../../../../../../../src/modules/content/application/commands';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { ContentTypeEnum, ContentPriorityEnum } from '../../../../../../../src/modules/content/domain/value-objects';

describe('CreateContentHandler', () => {
  let handler: CreateContentHandler;
  let mockContentRepository: jest.Mocked<IContentRepository>;

  beforeEach(() => {
    mockContentRepository = {
      save: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    } as any;

    handler = new CreateContentHandler(mockContentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validCommand: CreateContentCommand = new CreateContentCommand(
    'tenant-123',
    'author-123',
    'Test Content Title',
    'This is test content body with enough text.',
    ContentTypeEnum.ARTICLE,
    'Short excerpt',
    ContentPriorityEnum.HIGH,
    'category-123',
    ['tag1', 'tag2'],
    'https://example.com/image.jpg'
  );

  describe('execute', () => {
    it('should create content with valid data', async () => {
      mockContentRepository.save.mockImplementation(async (content) => content);

      const result = await handler.execute(validCommand);

      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ); // UUID format
    });

    it('should call repository.save with content aggregate', async () => {
      mockContentRepository.save.mockImplementation(async (content) => content);

      await handler.execute(validCommand);

      expect(mockContentRepository.save).toHaveBeenCalledTimes(1);
      const savedContent = mockContentRepository.save.mock.calls[0][0];

      expect(savedContent.tenantId).toBe('tenant-123');
      expect(savedContent.authorId).toBe('author-123');
      expect(savedContent.title).toBe('Test Content Title');
      expect(savedContent.content).toBe('This is test content body with enough text.');
      expect(savedContent.excerpt).toBe('Short excerpt');
      expect(savedContent.type.toString()).toBe('ARTICLE');
      expect(savedContent.status.toString()).toBe('DRAFT');
      expect(savedContent.priority.toString()).toBe('HIGH');
      expect(savedContent.categoryId).toBe('category-123');
      expect(savedContent.tags).toEqual(['tag1', 'tag2']);
      expect(savedContent.featuredImage).toBe('https://example.com/image.jpg');
    });

    it('should create content with default MEDIUM priority when not specified', async () => {
      const commandWithoutPriority = new CreateContentCommand(
        'tenant-123',
        'author-123',
        'Test Title',
        'Test content',
        ContentTypeEnum.NEWS,
        null,
        undefined, // No priority specified
        null,
        [],
        null
      );

      mockContentRepository.save.mockImplementation(async (content) => content);

      await handler.execute(commandWithoutPriority);

      const savedContent = mockContentRepository.save.mock.calls[0][0];
      expect(savedContent.priority.toString()).toBe('MEDIUM');
    });

    it('should create content with minimal required fields', async () => {
      const minimalCommand = new CreateContentCommand(
        'tenant-123',
        'author-123',
        'Minimal Title',
        'Minimal content body',
        ContentTypeEnum.ANNOUNCEMENT,
        null,
        undefined,
        null,
        undefined,
        null
      );

      mockContentRepository.save.mockImplementation(async (content) => content);

      await handler.execute(minimalCommand);

      const savedContent = mockContentRepository.save.mock.calls[0][0];
      expect(savedContent.excerpt).toBeNull();
      expect(savedContent.categoryId).toBeNull();
      expect(savedContent.tags).toEqual([]);
      expect(savedContent.featuredImage).toBeNull();
    });

    it('should emit ContentCreatedEvent when saving', async () => {
      mockContentRepository.save.mockImplementation(async (content) => content);

      await handler.execute(validCommand);

      const savedContent = mockContentRepository.save.mock.calls[0][0];
      const events = savedContent.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('ContentCreated');
    });

    it('should propagate repository errors', async () => {
      const repositoryError = new Error('Database connection failed');
      mockContentRepository.save.mockRejectedValue(repositoryError);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
