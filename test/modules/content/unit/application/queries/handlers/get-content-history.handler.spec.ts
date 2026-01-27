import { GetContentHistoryHandler } from '../../../../../../../src/modules/content/application/queries/handlers';
import { GetContentHistoryQuery } from '../../../../../../../src/modules/content/application/queries';
import { GetContentHistoryResponseDto } from '../../../../../../../src/modules/content/application/dtos';
import { IContentRepository } from '../../../../../../../src/modules/content/domain/repositories';
import { ContentHistoryService } from '../../../../../../../src/modules/content/domain/services';
import { NotFoundException } from '@core/common';
import { Content } from '../../../../../../../src/modules/content/domain/entities';

describe('GetContentHistoryHandler', () => {
  let handler: GetContentHistoryHandler;
  let mockContentRepository: jest.Mocked<IContentRepository>;
  let mockHistoryService: jest.Mocked<ContentHistoryService>;

  beforeEach(() => {
    mockContentRepository = {
      getById: jest.fn(),
      save: jest.fn(),
      findByTenantId: jest.fn(),
      findAll: jest.fn(),
    } as any;

    mockHistoryService = {
      getHistory: jest.fn(),
      recordChange: jest.fn(),
      recordBatchChanges: jest.fn(),
    } as any;

    handler = new GetContentHistoryHandler(
      mockContentRepository,
      mockHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return content history when content exists and belongs to tenant', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123', 50);

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
        title: 'Test Content',
      } as Content;

      const mockHistoryEntries = [
        {
          id: 'history-1',
          contentId: 'content-123',
          field: 'title',
          oldValue: 'Old Title',
          newValue: 'New Title',
          userId: 'user-1',
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'history-2',
          contentId: 'content-123',
          field: 'content',
          oldValue: 'Old content',
          newValue: 'New content',
          userId: 'user-2',
          timestamp: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockResolvedValue(mockHistoryEntries);

      const result = await handler.execute(query);

      expect(result).toEqual({
        contentId: 'content-123',
        entries: mockHistoryEntries,
        total: 2,
      });
      expect(mockContentRepository.getById).toHaveBeenCalledWith('content-123');
      expect(mockHistoryService.getHistory).toHaveBeenCalledWith(
        'content-123',
        50,
      );
    });

    it('should throw NotFoundException when content does not exist', async () => {
      const query = new GetContentHistoryQuery(
        'non-existent-id',
        'tenant-123',
      );

      mockContentRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when content belongs to different tenant', async () => {
      const query = new GetContentHistoryQuery(
        'content-123',
        'tenant-different',
      );

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
      } as Content;

      mockContentRepository.getById.mockResolvedValue(mockContent);

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should return empty history when no changes exist', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123');

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
      } as Content;

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockResolvedValue([]);

      const result = await handler.execute(query);

      expect(result).toEqual({
        contentId: 'content-123',
        entries: [],
        total: 0,
      });
    });

    it('should use default limit when not provided', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123');

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
      } as Content;

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockResolvedValue([]);

      await handler.execute(query);

      expect(mockHistoryService.getHistory).toHaveBeenCalledWith(
        'content-123',
        50,
      );
    });

    it('should handle custom limit parameter', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123', 10);

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
      } as Content;

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockResolvedValue([]);

      await handler.execute(query);

      expect(mockHistoryService.getHistory).toHaveBeenCalledWith(
        'content-123',
        10,
      );
    });

    it('should map history entries to DTOs correctly', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123');

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
      } as Content;

      const mockHistoryEntries = [
        {
          id: 'history-1',
          contentId: 'content-123',
          field: 'status',
          oldValue: 'DRAFT',
          newValue: 'PUBLISHED',
          userId: 'admin-1',
          timestamp: new Date('2024-01-15T12:00:00Z'),
        },
      ];

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockResolvedValue(mockHistoryEntries);

      const result = await handler.execute(query);

      expect(result.entries[0]).toEqual({
        id: 'history-1',
        contentId: 'content-123',
        field: 'status',
        oldValue: 'DRAFT',
        newValue: 'PUBLISHED',
        userId: 'admin-1',
        timestamp: new Date('2024-01-15T12:00:00Z'),
      });
    });

    it('should propagate repository errors', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123');
      const repoError = new Error('Database connection failed');

      mockContentRepository.getById.mockRejectedValue(repoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate history service errors', async () => {
      const query = new GetContentHistoryQuery('content-123', 'tenant-123');

      const mockContent = {
        id: 'content-123',
        tenantId: 'tenant-123',
      } as Content;

      const historyError = new Error('History service unavailable');

      mockContentRepository.getById.mockResolvedValue(mockContent);
      mockHistoryService.getHistory.mockRejectedValue(historyError);

      await expect(handler.execute(query)).rejects.toThrow(
        'History service unavailable',
      );
    });
  });
});
