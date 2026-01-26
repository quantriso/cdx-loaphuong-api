import { UpdateContentHandler } from '../../../../../../../src/modules/content/application/commands/handlers';
import { UpdateContentCommand } from '../../../../../../../src/modules/content/application/commands';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { Content } from '../../../../../../../src/modules/content/domain/entities';
import { ContentType } from '../../../../../../../src/modules/content/domain/value-objects';
import { ContentCacheService } from '../../../../../../../src/modules/content/application/services/content-cache.service';
import { ContentValidatorService } from '../../../../../../../src/modules/content/domain/services/content-validator.service';
import { ContentHistoryService } from '../../../../../../../src/modules/content/domain/services/content-history.service';

describe('UpdateContentHandler', () => {
  let handler: UpdateContentHandler;
  let mockRepository: jest.Mocked<IContentRepository>;
  let mockCacheService: jest.Mocked<ContentCacheService>;
  let mockValidatorService: jest.Mocked<ContentValidatorService>;
  let mockHistoryService: jest.Mocked<ContentHistoryService>;

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

    mockValidatorService = {
      validateCanEdit: jest.fn(),
    } as any;

    mockHistoryService = {
      recordChange: jest.fn(),
      getHistory: jest.fn(),
    } as any;

    handler = new UpdateContentHandler(
      mockRepository,
      mockCacheService,
      mockValidatorService,
      mockHistoryService,
    );
  });

  describe('execute', () => {
    it('should update content title', async () => {
      // Arrange
      const content = Content.create({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Original Title',
        content: 'Original content body',
        type: ContentType.article(),
      });

      mockValidatorService.validateCanEdit.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        false,
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockValidatorService.validateCanEdit).toHaveBeenCalledWith(
        'content-1',
        'tenant-1',
        'author-1',
        false,
      );
      expect(mockRepository.save).toHaveBeenCalled();
      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.title).toBe('Updated Title');
      expect(mockHistoryService.recordChange).toHaveBeenCalledWith(
        'content-1',
        'title',
        'Original Title',
        'Updated Title',
        'author-1',
      );
    });

    it('should update content body', async () => {
      // Arrange
      const content = Content.create({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Title',
        content: 'Original content body',
        type: ContentType.article(),
      });

      mockValidatorService.validateCanEdit.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        false,
        undefined,
        'Updated content body',
        undefined,
        undefined,
        undefined,
        undefined,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.content).toBe('Updated content body');
      expect(mockHistoryService.recordChange).toHaveBeenCalledWith(
        'content-1',
        'content',
        'Original content body',
        'Updated content body',
        'author-1',
      );
    });

    it('should throw NotFoundException if content does not exist', async () => {
      // Arrange
      mockValidatorService.validateCanEdit.mockRejectedValue(
        new Error('Content not found'),
      );

      const command = new UpdateContentCommand(
        'non-existent-id',
        'tenant-1',
        'author-1',
        false,
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
    });

    it('should throw NotFoundException if tenant does not match', async () => {
      // Arrange
      const content = Content.create({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Title',
        content: 'Test content',
        type: ContentType.article(),
      });

      mockValidatorService.validateCanEdit.mockRejectedValue(
        new Error('Tenant does not match'),
      );

      const command = new UpdateContentCommand(
        'content-1',
        'wrong-tenant',
        'author-1',
        false,
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const content = Content.create({
        id: 'content-1',
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Original Title',
        content: 'Original content',
        type: ContentType.article(),
      });

      mockValidatorService.validateCanEdit.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        false,
        'Updated Title',
        'Updated content body',
        'Updated excerpt',
        null,
        'https://example.com/image.jpg',
        ['tag1', 'tag2'],
      );

      // Act
      await handler.execute(command);

      // Assert
      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.title).toBe('Updated Title');
      expect(savedContent.content).toBe('Updated content body');
      expect(savedContent.excerpt).toBe('Updated excerpt');
      expect(savedContent.featuredImage).toBe('https://example.com/image.jpg');
      expect(savedContent.tags).toEqual(['tag1', 'tag2']);
      expect(mockCacheService.invalidateAllCaches).toHaveBeenCalled();
    });
  });
});
