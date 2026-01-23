import { UpdateContentHandler } from '../../../../../../../src/modules/content/application/commands/handlers';
import { UpdateContentCommand } from '../../../../../../../src/modules/content/application/commands';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { Content } from '../../../../../../../src/modules/content/domain/entities';
import { ContentType } from '../../../../../../../src/modules/content/domain/value-objects';

describe('UpdateContentHandler', () => {
  let handler: UpdateContentHandler;
  let mockRepository: jest.Mocked<IContentRepository>;

  beforeEach(() => {
    mockRepository = {
      getById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    } as any;

    handler = new UpdateContentHandler(mockRepository);
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

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.getById).toHaveBeenCalledWith('content-1');
      expect(mockRepository.save).toHaveBeenCalled();
      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.title).toBe('Updated Title');
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

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        undefined,
        'Updated content body',
        undefined,
        undefined,
        undefined,
        undefined
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.content).toBe('Updated content body');
    });

    it('should throw NotFoundException if content does not exist', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null);

      const command = new UpdateContentCommand(
        'non-existent-id',
        'tenant-1',
        'author-1',
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
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

      mockRepository.getById.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'wrong-tenant',
        'author-1',
        'Updated Title',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
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

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new UpdateContentCommand(
        'content-1',
        'tenant-1',
        'author-1',
        'Updated Title',
        'Updated content body',
        'Updated excerpt',
        null,
        'https://example.com/image.jpg',
        ['tag1', 'tag2']
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
    });
  });
});
