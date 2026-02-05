import { Test, TestingModule } from '@nestjs/testing';
import { VoteCommentHandler } from 'src/modules/comment/application/commands/handlers/vote-comment.handler';
import { VoteCommentCommand } from 'src/modules/comment/application/commands/vote-comment.command';
import { ICommentVoteRepository } from 'src/modules/comment/domain/repositories/comment-vote.repository.interface';
import { CommentRepositoryInterface } from 'src/modules/comment/domain/repositories/comment.repository.interface';
import { CommentId } from 'src/modules/comment/domain/value-objects/comment-id.value-object';
import { VoteType } from 'src/modules/comment/domain/value-objects/vote-type.enum';
import { CommentVote } from 'src/modules/comment/domain/entities/comment-vote.entity';
import {
  Comment,
  ModerationStatus,
} from 'src/modules/comment/domain/entities/comment.entity';
import { CommentContent } from 'src/modules/comment/domain/value-objects/comment-content.value-object';
import { DuplicateVoteException } from 'src/modules/comment/domain/exceptions/duplicate-vote.exception';
import { CommentNotFoundException } from 'src/modules/comment/domain/exceptions/comment-not-found.exception';
import { CommentNotApprovedException } from 'src/modules/comment/domain/exceptions/comment-not-approved.exception';
import { COMMENT_VOTE_REPOSITORY_TOKEN } from 'src/modules/comment/constants/tokens';

describe('VoteCommentHandler', () => {
  let handler: VoteCommentHandler;
  let mockVoteRepository: jest.Mocked<ICommentVoteRepository>;
  let mockCommentRepository: jest.Mocked<CommentRepositoryInterface>;

  beforeEach(async () => {
    mockVoteRepository = {
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByCommentAndUserId: jest.fn(),
      findByCommentId: jest.fn(),
      countByCommentIdAndType: jest.fn(),
      existsByCommentAndUserId: jest.fn(),
    } as unknown as jest.Mocked<ICommentVoteRepository>;

    mockCommentRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      getByCommentId: jest.fn(),
      getByAuthorId: jest.fn(),
      findByContentId: jest.fn(),
      findReplies: jest.fn(),
      findByAuthorId: jest.fn(),
      findByModerationStatus: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      countByContentId: jest.fn(),
      incrementLikeCount: jest.fn(),
      decrementLikeCount: jest.fn(),
      incrementDislikeCount: jest.fn(),
      decrementDislikeCount: jest.fn(),
      findPaginated: jest.fn(),
      getById: jest.fn(),
    } as unknown as jest.Mocked<CommentRepositoryInterface>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteCommentHandler,
        {
          provide: COMMENT_VOTE_REPOSITORY_TOKEN,
          useValue: mockVoteRepository,
        },
        {
          provide: 'ICommentVoteRepository',
          useExisting: COMMENT_VOTE_REPOSITORY_TOKEN,
        },
        {
          provide: 'CommentRepositoryInterface',
          useValue: mockCommentRepository,
        },
      ],
    }).compile();

    handler = module.get<VoteCommentHandler>(VoteCommentHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createMockComment = (likeCount = 0, dislikeCount = 0) => {
      const commentContent = CommentContent.create('Test comment');
      return Comment.reconstitute({
        id: 'comment-123',
        contentId: 'content-456',
        authorId: 'author-789',
        content: commentContent,
        tenantId: 'tenant-1',
        moderationStatus: ModerationStatus.APPROVED,
        likeCount,
        dislikeCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    };

    it('should successfully cast a like vote', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.LIKE,
      );

      const mockComment = createMockComment(5, 2);
      const updatedMockComment = createMockComment(6, 2);

      mockCommentRepository.findById.mockResolvedValue(mockComment);
      mockCommentRepository.findById
        .mockResolvedValueOnce(mockComment)
        .mockResolvedValueOnce(updatedMockComment);
      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(null);
      mockVoteRepository.save.mockResolvedValue(undefined);
      mockCommentRepository.incrementLikeCount.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockCommentRepository.findById).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
      );
      expect(mockVoteRepository.findByCommentAndUserId).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
        'user-456',
      );
      expect(mockVoteRepository.save).toHaveBeenCalled();
      expect(mockCommentRepository.incrementLikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(result.voted).toBe(true);
      expect(result.voteType).toBe('LIKE');
      expect(result.comment).toBeDefined();
    });

    it('should successfully cast a dislike vote', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.DISLIKE,
      );

      const mockComment = createMockComment(5, 2);
      const updatedMockComment = createMockComment(5, 3);

      mockCommentRepository.findById
        .mockResolvedValueOnce(mockComment)
        .mockResolvedValueOnce(updatedMockComment);
      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(null);
      mockVoteRepository.save.mockResolvedValue(undefined);
      mockCommentRepository.incrementDislikeCount.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockCommentRepository.findById).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
      );
      expect(mockVoteRepository.findByCommentAndUserId).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
        'user-456',
      );
      expect(mockVoteRepository.save).toHaveBeenCalled();
      expect(mockCommentRepository.incrementDislikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(result.voted).toBe(true);
      expect(result.voteType).toBe('DISLIKE');
    });

    it('should throw CommentNotFoundException when comment does not exist', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.LIKE,
      );

      mockCommentRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        CommentNotFoundException,
      );
    });

    it('should throw CommentNotApprovedException when comment is not approved', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.LIKE,
      );

      const commentContent = CommentContent.create('Test comment');
      const pendingComment = Comment.reconstitute({
        id: 'comment-123',
        contentId: 'content-456',
        authorId: 'author-789',
        content: commentContent,
        tenantId: 'tenant-1',
        moderationStatus: ModerationStatus.PENDING,
        likeCount: 0,
        dislikeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCommentRepository.findById.mockResolvedValue(pendingComment);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        CommentNotApprovedException,
      );
    });

    it('should throw DuplicateVoteException when user has already voted with same type', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.LIKE,
      );

      const mockComment = createMockComment(5, 2);
      const existingVote = CommentVote.create(
        CommentId.fromString('comment-123'),
        'user-456',
        VoteType.LIKE,
      );

      mockCommentRepository.findById.mockResolvedValue(mockComment);
      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(existingVote);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        DuplicateVoteException,
      );
    });

    it('should change vote type when user votes with different type', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.DISLIKE,
      );

      const mockComment = createMockComment(5, 2);
      const updatedMockComment = createMockComment(4, 3);

      const existingVote = CommentVote.create(
        CommentId.fromString('comment-123'),
        'user-456',
        VoteType.LIKE,
      );

      mockCommentRepository.findById
        .mockResolvedValueOnce(mockComment)
        .mockResolvedValueOnce(updatedMockComment);
      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(existingVote);
      mockVoteRepository.update.mockResolvedValue(undefined);
      mockCommentRepository.decrementLikeCount.mockResolvedValue(undefined);
      mockCommentRepository.incrementDislikeCount.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockVoteRepository.findByCommentAndUserId).toHaveBeenCalledWith(
        CommentId.fromString('comment-123'),
        'user-456',
      );
      expect(mockVoteRepository.update).toHaveBeenCalledWith(existingVote);
      expect(mockCommentRepository.decrementLikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(mockCommentRepository.incrementDislikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(result.voted).toBe(true);
      expect(result.voteType).toBe('DISLIKE');
    });

    it('should correctly update counts when changing from dislike to like', async () => {
      // Arrange
      const command = new VoteCommentCommand(
        'comment-123',
        'user-456',
        VoteType.LIKE,
      );

      const mockComment = createMockComment(5, 2);
      const updatedMockComment = createMockComment(6, 1);

      const existingVote = CommentVote.create(
        CommentId.fromString('comment-123'),
        'user-456',
        VoteType.DISLIKE,
      );

      mockCommentRepository.findById
        .mockResolvedValueOnce(mockComment)
        .mockResolvedValueOnce(updatedMockComment);
      mockVoteRepository.findByCommentAndUserId.mockResolvedValue(existingVote);
      mockVoteRepository.update.mockResolvedValue(undefined);
      mockCommentRepository.decrementDislikeCount.mockResolvedValue(undefined);
      mockCommentRepository.incrementLikeCount.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockCommentRepository.decrementDislikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(mockCommentRepository.incrementLikeCount).toHaveBeenCalledWith(
        'comment-123',
      );
      expect(result.voted).toBe(true);
      expect(result.voteType).toBe('LIKE');
    });
  });
});
