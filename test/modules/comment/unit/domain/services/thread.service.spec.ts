import { ThreadService } from '@modules/comment/domain/services/thread.service';
import type { CommentRepositoryInterface } from '@modules/comment/domain/repositories/comment.repository.interface';
import { Comment } from '@modules/comment/domain/entities/comment.entity';
import { CommentContent } from '@modules/comment/domain/value-objects/comment-content.value-object';
import { CommentId } from '@modules/comment/domain/value-objects/comment-id.value-object';

describe('ThreadService', () => {
  let service: ThreadService;
  let mockRepository: jest.Mocked<CommentRepositoryInterface>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findReplies: jest.fn(),
      getById: jest.fn(),
      getByContentId: jest.fn(),
      getByAuthorId: jest.fn(),
      getByParentCommentId: jest.fn(),
      findPaginated: jest.fn(),
      update: jest.fn(),
      findByContentId: jest.fn(),
      findByAuthorId: jest.fn(),
      findByModerationStatus: jest.fn(),
      exists: jest.fn(),
      countByContentId: jest.fn(),
    } as jest.Mocked<CommentRepositoryInterface>;

    service = new ThreadService(mockRepository);
  });

  describe('calculateThreadDepth', () => {
    it('should return 0 for a root comment (no parent)', async () => {
      // Arrange
      const commentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined, // No parentCommentId
      );

      mockRepository.findById.mockResolvedValue(rootComment);

      // Act
      const depth = await service.calculateThreadDepth(commentId);

      // Assert
      expect(depth).toBe(0);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should return 1 for a first-level reply', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const replyId = CommentId.generate();
      const reply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('Reply'),
        'tenant-1',
        rootCommentId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(reply) // First call: get reply
        .mockResolvedValueOnce(rootComment); // Second call: get parent

      // Act
      const depth = await service.calculateThreadDepth(replyId);

      // Assert
      expect(depth).toBe(1);
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should return 2 for a second-level reply (reply to reply)', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const firstReplyId = CommentId.generate();
      const firstReply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        rootCommentId.value,
      );

      const secondReplyId = CommentId.generate();
      const secondReply = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Second reply'),
        'tenant-1',
        firstReplyId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(secondReply) // Get second reply
        .mockResolvedValueOnce(firstReply) // Get first reply (parent)
        .mockResolvedValueOnce(rootComment); // Get root comment (grandparent)

      // Act
      const depth = await service.calculateThreadDepth(secondReplyId);

      // Assert
      expect(depth).toBe(2);
      expect(mockRepository.findById).toHaveBeenCalledTimes(3);
    });

    it('should return 3 for a third-level reply (max depth)', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const firstReplyId = CommentId.generate();
      const firstReply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        rootCommentId.value,
      );

      const secondReplyId = CommentId.generate();
      const secondReply = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Second reply'),
        'tenant-1',
        firstReplyId.value,
      );

      const thirdReplyId = CommentId.generate();
      const thirdReply = Comment.create(
        'content-1',
        'user-4',
        new CommentContent('Third reply'),
        'tenant-1',
        secondReplyId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(thirdReply)
        .mockResolvedValueOnce(secondReply)
        .mockResolvedValueOnce(firstReply)
        .mockResolvedValueOnce(rootComment);

      // Act
      const depth = await service.calculateThreadDepth(thirdReplyId);

      // Assert
      expect(depth).toBe(3);
      expect(mockRepository.findById).toHaveBeenCalledTimes(4);
    });

    it('should return 0 if comment is not found', async () => {
      // Arrange
      const commentId = CommentId.generate();
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const depth = await service.calculateThreadDepth(commentId);

      // Assert
      expect(depth).toBe(0);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle orphaned comments (parent not found)', async () => {
      // Arrange
      const commentId = CommentId.generate();
      const comment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Orphan comment'),
        'tenant-1',
        'non-existent-parent',
      );

      mockRepository.findById
        .mockResolvedValueOnce(comment)
        .mockResolvedValueOnce(null); // Parent not found

      // Act
      const depth = await service.calculateThreadDepth(commentId);

      // Assert
      expect(depth).toBe(1); // Returns 1 because the comment itself is a reply
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateThreadDepth', () => {
    it('should pass validation for root comments (depth 0)', async () => {
      // Arrange
      const commentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      mockRepository.findById.mockResolvedValue(rootComment);

      // Act & Assert - Should not throw
      await expect(
        service.validateThreadDepth(commentId),
      ).resolves.not.toThrow();
    });

    it('should pass validation for first-level replies (depth 1)', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const replyId = CommentId.generate();
      const reply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('Reply'),
        'tenant-1',
        rootCommentId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(reply)
        .mockResolvedValueOnce(rootComment);

      // Act & Assert - Should not throw
      await expect(service.validateThreadDepth(replyId)).resolves.not.toThrow();
    });

    it('should pass validation for second-level replies (depth 2)', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const firstReplyId = CommentId.generate();
      const firstReply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        rootCommentId.value,
      );

      const secondReplyId = CommentId.generate();
      const secondReply = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Second reply'),
        'tenant-1',
        firstReplyId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(secondReply)
        .mockResolvedValueOnce(firstReply)
        .mockResolvedValueOnce(rootComment);

      // Act & Assert - Should not throw
      await expect(
        service.validateThreadDepth(secondReplyId),
      ).resolves.not.toThrow();
    });

    it('should throw MaxThreadDepthExceededException for third-level replies (depth 3)', async () => {
      // Arrange
      const rootCommentId = CommentId.generate();
      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
      );

      const firstReplyId = CommentId.generate();
      const firstReply = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        rootCommentId.value,
      );

      const secondReplyId = CommentId.generate();
      const secondReply = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Second reply'),
        'tenant-1',
        firstReplyId.value,
      );

      const thirdReplyId = CommentId.generate();
      const thirdReply = Comment.create(
        'content-1',
        'user-4',
        new CommentContent('Third reply'),
        'tenant-1',
        secondReplyId.value,
      );

      mockRepository.findById
        .mockResolvedValueOnce(thirdReply)
        .mockResolvedValueOnce(secondReply)
        .mockResolvedValueOnce(firstReply)
        .mockResolvedValueOnce(rootComment);

      // Act & Assert
      await expect(service.validateThreadDepth(thirdReplyId)).rejects.toThrow(
        'Maximum thread depth exceeded. Cannot reply beyond 3 levels (current: 4).',
      );
    });

    it('should handle comment not found gracefully', async () => {
      // Arrange
      const commentId = CommentId.generate();
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert - Should not throw, just handle gracefully
      await expect(
        service.validateThreadDepth(commentId),
      ).resolves.not.toThrow();
    });
  });
});
