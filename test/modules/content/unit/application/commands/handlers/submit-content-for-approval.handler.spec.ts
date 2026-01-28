import { SubmitContentForApprovalHandler } from '../../../../../../../src/modules/content/application/commands/handlers';
import { SubmitContentForApprovalCommand } from '../../../../../../../src/modules/content/application/commands';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { IContentReadDao } from '../../../../../../../src/modules/content/application/queries/ports';
import { Content } from '../../../../../../../src/modules/content/domain/entities';
import {
  ContentId,
  ContentType,
  ContentStatus,
} from '../../../../../../../src/modules/content/domain/value-objects';
import { ContentSubmittedForApprovalEvent } from '../../../../../../../src/modules/content/domain/events';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SubmitContentForApprovalHandler', () => {
  let handler: SubmitContentForApprovalHandler;
  let mockRepository: jest.Mocked<IContentRepository>;
  let mockReadDao: jest.Mocked<IContentReadDao>;

  beforeEach(() => {
    mockRepository = {
      getById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsById: jest.fn(),
    } as any;

    mockReadDao = {
      findById: jest.fn(),
      findByAuthor: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new SubmitContentForApprovalHandler(mockRepository, mockReadDao);
  });

  describe('execute', () => {
    it('should submit DRAFT content for approval', async () => {
      // Arrange
      const content = Content.create(new ContentId('content-1'), {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test content body for submission',
        type: ContentType.article(),
      });

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new SubmitContentForApprovalCommand(
        'content-1',
        'tenant-1',
        'author-1',
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.getById).toHaveBeenCalledWith('content-1');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockReadDao.invalidateCache).toHaveBeenCalledWith('content-1');

      const savedContent = mockRepository.save.mock.calls[0][0];
      expect(savedContent.status.isPending()).toBe(true);
    });

    it('should throw NotFoundException if content does not exist', async () => {
      // Arrange
      mockRepository.getById.mockResolvedValue(null);

      const command = new SubmitContentForApprovalCommand(
        'non-existent-id',
        'tenant-1',
        'author-1',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if tenant does not match', async () => {
      // Arrange
      const content = Content.create(new ContentId('content-1'), {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      mockRepository.getById.mockResolvedValue(content);

      const command = new SubmitContentForApprovalCommand(
        'content-1',
        'wrong-tenant',
        'author-1',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not author', async () => {
      // Arrange
      const content = Content.create(new ContentId('content-1'), {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      mockRepository.getById.mockResolvedValue(content);

      const command = new SubmitContentForApprovalCommand(
        'content-1',
        'tenant-1',
        'different-user',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if content is not in DRAFT status', async () => {
      // Arrange
      const content = Content.create(new ContentId('content-1'), {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test content body',
        type: ContentType.article(),
      });

      // Submit it once (transitions to PENDING)
      content.submitForApproval();

      mockRepository.getById.mockResolvedValue(content);

      const command = new SubmitContentForApprovalCommand(
        'content-1',
        'tenant-1',
        'author-1',
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should emit ContentSubmittedForApprovalEvent', async () => {
      // Arrange
      const content = Content.create(new ContentId('content-1'), {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test content body for event verification',
        type: ContentType.article(),
      });

      mockRepository.getById.mockResolvedValue(content);
      mockRepository.save.mockResolvedValue(content);

      const command = new SubmitContentForApprovalCommand(
        'content-1',
        'tenant-1',
        'author-1',
      );

      // Act
      await handler.execute(command);

      // Assert
      const savedContent = mockRepository.save.mock.calls[0][0];
      const events = savedContent.getDomainEvents();

      expect(events.length).toBeGreaterThan(0);
      const submitEvent = events.find(
        (e) => e.eventType === 'ContentSubmittedForApproval',
      ) as ContentSubmittedForApprovalEvent | undefined;
      expect(submitEvent).toBeDefined();
      expect(submitEvent?.data.previousStatus).toBe('DRAFT');
      expect(submitEvent?.data.newStatus).toBe('PENDING');
    });
  });
});
