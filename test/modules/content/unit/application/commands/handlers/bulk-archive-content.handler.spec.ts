import { BulkArchiveContentHandler } from '../../../../../../../src/modules/content/application/commands/handlers';
import { BulkArchiveContentCommand } from '../../../../../../../src/modules/content/application/commands';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { Content } from '../../../../../../../src/modules/content/domain/entities';
import {
  ContentType,
  ContentStatus,
  ContentPriority,
} from '../../../../../../../src/modules/content/domain/value-objects';
import { ContentCacheService } from '../../../../../../../src/modules/content/application/services/content-cache.service';

describe('BulkArchiveContentHandler', () => {
  let handler: BulkArchiveContentHandler;
  let mockRepository: jest.Mocked<IContentRepository>;
  let mockCacheService: jest.Mocked<ContentCacheService>;

  beforeEach(() => {
    mockRepository = {
      getById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    } as any;

    mockCacheService = {
      getContentDetails: jest.fn(),
      setContentDetails: jest.fn(),
      invalidateContentDetails: jest.fn(),
      getContentList: jest.fn(),
      setContentList: jest.fn(),
      invalidateContentList: jest.fn(),
      invalidateAllCaches: jest.fn(),
      clearTenantCache: jest.fn(),
      warmCache: jest.fn(),
    } as any;

    handler = new BulkArchiveContentHandler(mockRepository, mockCacheService);
  });

  describe('execute', () => {
    it('should archive multiple published contents', async () => {
      // Arrange
      const content1 = Content.reconstitute({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 1',
        content: 'Content 1 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.published(),
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const content2 = Content.reconstitute({
        id: 'content-2',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 2',
        content: 'Content 2 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.published(),
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.getById
        .mockResolvedValueOnce(content1)
        .mockResolvedValueOnce(content2);
      mockRepository.save.mockResolvedValue(content1);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }, { contentId: 'content-2' }],
        'admin-1',
        'tenant-1',
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.totalRequested).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].contentId).toBe('content-1');
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].contentId).toBe('content-2');
      expect(result.results[1].success).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(mockCacheService.invalidateContentList).toHaveBeenCalledWith(
        'tenant-1',
      );
    });

    it('should handle content not found error', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValueOnce(null);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }],
        'admin-1',
        'tenant-1',
        { allowPartialSuccess: true },
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.totalRequested).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        contentId: 'content-1',
        success: false,
        error: 'Content not found',
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle tenant ownership mismatch', async () => {
      // Arrange
      const content = Content.reconstitute({
        id: 'content-1',
        tenantId: 'tenant-2',
        authorId: 'author-1',
        title: 'Content 1',
        content: 'Content 1 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.published(),
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.getById.mockResolvedValueOnce(content);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }],
        'admin-1',
        'tenant-1',
        { allowPartialSuccess: true },
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.totalRequested).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        contentId: 'content-1',
        success: false,
        error: 'Content not found in tenant',
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle domain exceptions during archive', async () => {
      // Arrange
      const content = Content.reconstitute({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 1',
        content: 'Content 1 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.approved(), // Not published - will throw exception
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.getById.mockResolvedValueOnce(content);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }],
        'admin-1',
        'tenant-1',
        { allowPartialSuccess: true },
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.totalRequested).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].contentId).toBe('content-1');
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Cannot archive content');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure', async () => {
      // Arrange
      const content1 = Content.reconstitute({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 1',
        content: 'Content 1 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.published(),
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const content2 = Content.reconstitute({
        id: 'content-2',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 2',
        content: 'Content 2 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.approved(), // Not published - will fail
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.getById
        .mockResolvedValueOnce(content1)
        .mockResolvedValueOnce(content2);
      mockRepository.save.mockResolvedValue(content1);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }, { contentId: 'content-2' }],
        'admin-1',
        'tenant-1',
        { allowPartialSuccess: true },
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.totalRequested).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache for each content before archiving', async () => {
      // Arrange
      const content = Content.reconstitute({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Content 1',
        content: 'Content 1 body',
        excerpt: null,
        type: ContentType.article(),
        status: ContentStatus.published(),
        priority: ContentPriority.medium(),
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepository.getById.mockResolvedValueOnce(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new BulkArchiveContentCommand(
        [{ contentId: 'content-1' }],
        'admin-1',
        'tenant-1',
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockCacheService.invalidateContentDetails).toHaveBeenCalledWith(
        'tenant-1',
        'content-1',
      );
    });
  });
});
