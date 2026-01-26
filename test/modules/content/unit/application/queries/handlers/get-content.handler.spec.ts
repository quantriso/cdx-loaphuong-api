import { GetContentHandler } from '../../../../../../../src/modules/content/application/queries/handlers';
import { GetContentQuery } from '../../../../../../../src/modules/content/application/queries';
import { IContentReadDao } from '../../../../../../../src/modules/content/application/queries/ports';
import { ContentResponseDto } from '../../../../../../../src/modules/content/application/dtos';
import { NotFoundException } from '@core/common';

describe('GetContentHandler', () => {
  let handler: GetContentHandler;
  let mockContentReadDao: jest.Mocked<IContentReadDao>;

  beforeEach(() => {
    mockContentReadDao = {
      findById: jest.fn(),
      findByAuthor: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateCacheMany: jest.fn(),
    } as any;

    handler = new GetContentHandler(mockContentReadDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return content when found', async () => {
      const query = new GetContentQuery('content-123', 'tenant-123');
      const expectedContent = new ContentResponseDto({
        id: 'content-123',
        tenantId: 'tenant-123',
        authorId: 'author-123',
        title: 'Test Content',
        content: 'Test content body',
        excerpt: 'Test excerpt',
        type: 'ARTICLE',
        status: 'DRAFT',
        priority: 'MEDIUM',
        categoryId: null,
        tags: [],
        featuredImage: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockContentReadDao.findById.mockResolvedValue(expectedContent);

      const result = await handler.execute(query);

      expect(result).toBe(expectedContent);
      expect(mockContentReadDao.findById).toHaveBeenCalledWith(
        'content-123',
        'tenant-123',
      );
      expect(mockContentReadDao.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when content not found', async () => {
      const query = new GetContentQuery('non-existent-id', 'tenant-123');

      mockContentReadDao.findById.mockResolvedValue(null);

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow(
        'Content with ID non-existent-id not found',
      );
    });

    it('should call findById with correct parameters', async () => {
      const query = new GetContentQuery('content-456', 'tenant-789');
      const content = new ContentResponseDto({
        id: 'content-456',
        tenantId: 'tenant-789',
        authorId: 'author-123',
        title: 'Another Content',
        content: 'Another content body',
        excerpt: null,
        type: 'NEWS',
        status: 'DRAFT',
        priority: 'HIGH',
        categoryId: 'category-123',
        tags: ['tag1', 'tag2'],
        featuredImage: 'https://example.com/image.jpg',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockContentReadDao.findById.mockResolvedValue(content);

      await handler.execute(query);

      expect(mockContentReadDao.findById).toHaveBeenCalledWith(
        'content-456',
        'tenant-789',
      );
    });

    it('should propagate DAO errors', async () => {
      const query = new GetContentQuery('content-123', 'tenant-123');
      const daoError = new Error('Database connection failed');

      mockContentReadDao.findById.mockRejectedValue(daoError);

      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
