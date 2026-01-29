import { ListContentsHandler } from '../../../../../../../src/modules/content/application/queries/handlers';
import { ListContentsQuery } from '../../../../../../../src/modules/content/application/queries';
import { IContentReadDao } from '../../../../../../../src/modules/content/application/queries/ports';
import { ContentResponseDto } from '../../../../../../../src/modules/content/application/dtos';
import { PaginatedResponseDto } from '../../../../../../../src/libs/shared/http/dtos/pagination.dto';

describe('ListContentsHandler', () => {
  let handler: ListContentsHandler;
  let mockContentReadDao: jest.Mocked<IContentReadDao>;

  beforeEach(() => {
    mockContentReadDao = {
      findById: jest.fn(),
      findByAuthor: jest.fn(),
      listContents: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new ListContentsHandler(mockContentReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return paginated list of contents with default parameters', async () => {
      const query = new ListContentsQuery('tenant-123');
      const mockContent = new ContentResponseDto({
        id: 'content-1',
        tenantId: 'tenant-123',
        authorId: 'author-1',
        title: 'Test Content',
        content: 'Test body',
        excerpt: 'Test excerpt',
        type: 'ARTICLE',
        status: 'PUBLISHED',
        priority: 'MEDIUM',
        categoryId: 'EMERGENCY',
        tags: ['covid', 'health'],
        featuredImage: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const expectedResult = new PaginatedResponseDto([mockContent], 1, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(expectedResult);

      const result = await handler.execute(query);

      expect(result).toBe(expectedResult);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      );
    });

    it('should filter by category', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        'EMERGENCY', // category
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          category: 'EMERGENCY',
        }),
      );
    });

    it('should filter by tags with AND logic', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        undefined,
        ['covid', 'health'], // tags
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          tags: ['covid', 'health'],
        }),
      );
    });

    it('should filter by date range', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        undefined,
        undefined,
        '2026-01-01T00:00:00.000Z', // dateFrom
        '2026-01-31T23:59:59.999Z', // dateTo
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          dateFrom: '2026-01-01T00:00:00.000Z',
          dateTo: '2026-01-31T23:59:59.999Z',
        }),
      );
    });

    it('should filter by type and author', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'ARTICLE', // type
        'author-123', // authorId
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          type: 'ARTICLE',
          authorId: 'author-123',
        }),
      );
    });

    it('should filter by status array', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['PUBLISHED', 'ARCHIVED'], // status
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          status: ['PUBLISHED', 'ARCHIVED'],
        }),
      );
    });

    it('should support custom sorting', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'updatedAt', // sortBy
        'asc', // sortOrder
      );

      const mockResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          sortBy: 'updatedAt',
          sortOrder: 'asc',
        }),
      );
    });

    it('should support pagination', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        3, // page 3
        50, // limit 50
      );

      const mockResult = new PaginatedResponseDto([], 150, 3, 50);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      const result = await handler.execute(query);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(3);
      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          page: 3,
          limit: 50,
        }),
      );
    });

    it('should apply all filters simultaneously', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        2,
        10,
        'EMERGENCY',
        ['covid', 'health'],
        '2026-01-01T00:00:00.000Z',
        '2026-01-31T23:59:59.999Z',
        'ARTICLE',
        'author-123',
        ['PUBLISHED'],
        'updatedAt',
        'desc',
      );

      const mockResult = new PaginatedResponseDto([], 0, 2, 10);
      mockContentReadDao.listContents.mockResolvedValue(mockResult);

      await handler.execute(query);

      expect(mockContentReadDao.listContents).toHaveBeenCalledWith(
        'tenant-123',
        {
          page: 2,
          limit: 10,
          category: 'EMERGENCY',
          tags: ['covid', 'health'],
          dateFrom: '2026-01-01T00:00:00.000Z',
          dateTo: '2026-01-31T23:59:59.999Z',
          type: 'ARTICLE',
          authorId: 'author-123',
          status: ['PUBLISHED'],
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        },
      );
    });

    it('should return empty list when no contents match filters', async () => {
      const query = new ListContentsQuery(
        'tenant-123',
        1,
        20,
        'NONEXISTENT',
      );

      const emptyResult = new PaginatedResponseDto([], 0, 1, 20);
      mockContentReadDao.listContents.mockResolvedValue(emptyResult);

      const result = await handler.execute(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should propagate DAO errors', async () => {
      const query = new ListContentsQuery('tenant-123');
      const daoError = new Error('Database connection failed');

      mockContentReadDao.listContents.mockRejectedValue(daoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
