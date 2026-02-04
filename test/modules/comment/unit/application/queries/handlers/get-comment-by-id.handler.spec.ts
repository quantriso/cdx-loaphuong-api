import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetCommentByIdHandler } from 'src/modules/comment/application/queries/handlers/get-comment-by-id.handler';
import { GetCommentByIdQuery } from 'src/modules/comment/application/queries/get-comment-by-id.query';
import { ICommentReadDaoPort } from 'src/modules/comment/application/queries/ports/comment-read-dao.interface';
import { COMMENT_READ_DAO_TOKEN } from 'src/modules/comment/constants';
import { CommentDto } from 'src/modules/comment/application/dtos/comment.dto';
import { CommentNotFoundException } from 'src/modules/comment/domain/exceptions/comment-not-found.exception';
import { ModerationStatus } from 'src/modules/comment/domain/entities/comment.entity';

describe('GetCommentByIdHandler', () => {
  let handler: GetCommentByIdHandler;
  let mockCommentReadDao: jest.Mocked<ICommentReadDaoPort>;

  const mockComment: CommentDto = {
    id: 'comment-123',
    contentId: 'content-456',
    content: 'This is a test comment',
    authorId: 'user-789',
    parentId: null,
    tenantId: 'tenant-123',
    moderationStatus: ModerationStatus.APPROVED,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    // Create mock DAO
    mockCommentReadDao = {
      findById: jest.fn(),
      findPaginated: jest.fn(),
      findByContentId: jest.fn(),
      findReplies: jest.fn(),
      findByAuthorId: jest.fn(),
      findByModerationStatus: jest.fn(),
      countByContentId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCommentByIdHandler,
        {
          provide: COMMENT_READ_DAO_TOKEN,
          useValue: mockCommentReadDao,
        },
      ],
    }).compile();

    handler = module.get<GetCommentByIdHandler>(GetCommentByIdHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return a comment when it exists', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('comment-123');
      mockCommentReadDao.findById.mockResolvedValue(mockComment);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(mockCommentReadDao.findById).toHaveBeenCalledWith(
        'comment-123',
        'default',
      );
      expect(result).toEqual(mockComment);
    });

    it('should throw CommentNotFoundException when comment does not exist', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('non-existent-id');
      mockCommentReadDao.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        CommentNotFoundException,
      );
      await expect(handler.execute(query)).rejects.toThrow(
        'Comment with ID "non-existent-id" not found',
      );
    });

    it('should handle deleted comments (null check)', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('deleted-comment-id');
      mockCommentReadDao.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        CommentNotFoundException,
      );
    });

    it('should pass correct tenant ID to findById', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('comment-123');
      mockCommentReadDao.findById.mockResolvedValue(mockComment);

      // Act
      await handler.execute(query);

      // Assert
      expect(mockCommentReadDao.findById).toHaveBeenCalledTimes(1);
      expect(mockCommentReadDao.findById).toHaveBeenCalledWith(
        'comment-123',
        'default',
      );
    });

    it('should return comment with all expected fields', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('comment-123');
      const commentWithReplies: CommentDto = {
        ...mockComment,
        parentId: 'parent-456',
      };
      mockCommentReadDao.findById.mockResolvedValue(commentWithReplies);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toHaveProperty('id', 'comment-123');
      expect(result).toHaveProperty('contentId', 'content-456');
      expect(result).toHaveProperty('content', 'This is a test comment');
      expect(result).toHaveProperty('authorId', 'user-789');
      expect(result).toHaveProperty('tenantId', 'tenant-123');
      expect(result).toHaveProperty('parentId', 'parent-456');
      expect(result).toHaveProperty(
        'moderationStatus',
        ModerationStatus.APPROVED,
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('comment-123');
      mockCommentReadDao.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle comments with null parentId (root comments)', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('root-comment-123');
      const rootComment: CommentDto = {
        ...mockComment,
        parentId: null,
      };
      mockCommentReadDao.findById.mockResolvedValue(rootComment);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.parentId).toBeNull();
    });

    it('should handle comments with mentions', async () => {
      // Arrange
      const query = new GetCommentByIdQuery('comment-with-mentions');
      const commentWithMentions: CommentDto = {
        ...mockComment,
        mentions: ['user1', 'user2'],
      };
      mockCommentReadDao.findById.mockResolvedValue(commentWithMentions);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.mentions).toEqual(['user1', 'user2']);
    });
  });
});
