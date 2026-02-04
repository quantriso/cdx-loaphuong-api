import { GetCommentThreadHandler } from '@modules/comment/application/queries/handlers/get-comment-thread.handler';
import { GetCommentThreadQuery } from '@modules/comment/application/queries/get-comment-thread.query';
import { ThreadService } from '@modules/comment/domain/services/thread.service';
import { Comment } from '@modules/comment/domain/entities/comment.entity';
import { CommentId } from '@modules/comment/domain/value-objects/comment-id.value-object';
import { CommentContent } from '@modules/comment/domain/value-objects/comment-content.value-object';
import { CommentNotFoundException } from '@modules/comment/domain/exceptions/comment-not-found.exception';
import { randomUUID } from 'crypto';

describe('GetCommentThreadHandler', () => {
  let handler: GetCommentThreadHandler;
  let mockThreadService: jest.Mocked<Partial<ThreadService>>;

  beforeEach(() => {
    mockThreadService = {
      calculateThreadDepth: jest.fn(),
      findRootCommentId: jest.fn(),
      validateThreadDepth: jest.fn(),
      buildThreadStructure: jest.fn(),
      countReplies: jest.fn(),
      getThreadMaxDepth: jest.fn(),
    } as jest.Mocked<Partial<ThreadService>>;

    handler = new GetCommentThreadHandler(mockThreadService as any);
  });

  describe('Story 6.2: Reply to comment', () => {
    it('should retrieve a root comment thread with replies', async () => {
      // Arrange
      const commentId = randomUUID();
      const query = new GetCommentThreadQuery(commentId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
        undefined,
      );

      // Set the comment ID manually for testing
      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: commentId,
        },
      });

      const reply1Id = randomUUID();
      const reply1 = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        commentId,
        undefined,
      );

      const reply2Id = randomUUID();
      const reply2 = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Second reply'),
        'tenant-1',
        commentId,
        undefined,
      );

      const threadNode = {
        comment: rootComment,
        replies: [
          {
            comment: reply1,
            replies: [],
            depth: 1,
            replyCount: 0,
          },
          {
            comment: reply2,
            replies: [],
            depth: 1,
            replyCount: 0,
          },
        ],
        depth: 0,
        replyCount: 2,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.comment).toBeDefined();
      expect(result.comment.id).toBe(commentId);
      expect(result.replies).toHaveLength(2);
      expect(result.depth).toBe(0);
      expect(result.replyCount).toBe(2);
      expect(result.maxDepth).toBe(1);
      expect(result.replies[0].depth).toBe(1);
      expect(result.replies[1].depth).toBe(1);
    });

    it('should retrieve a nested comment thread (reply with sub-replies)', async () => {
      // Arrange
      const rootCommentId = randomUUID();
      const reply1Id = randomUUID();
      const query = new GetCommentThreadQuery(rootCommentId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment'),
        'tenant-1',
        undefined,
        undefined,
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: rootCommentId,
        },
      });

      const reply1 = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('First reply'),
        'tenant-1',
        rootCommentId,
        undefined,
      );

      Object.assign(reply1, {
        _props: {
          ...reply1['_props'],
          id: reply1Id,
        },
      });

      const subReply1Id = randomUUID();
      const subReply1 = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Sub-reply 1'),
        'tenant-1',
        reply1Id,
        undefined,
      );

      const subReply2Id = randomUUID();
      const subReply2 = Comment.create(
        'content-1',
        'user-4',
        new CommentContent('Sub-reply 2'),
        'tenant-1',
        reply1Id,
        undefined,
      );

      const threadNode = {
        comment: rootComment,
        replies: [
          {
            comment: reply1,
            replies: [
              {
                comment: subReply1,
                replies: [],
                depth: 2,
                replyCount: 0,
              },
              {
                comment: subReply2,
                replies: [],
                depth: 2,
                replyCount: 0,
              },
            ],
            depth: 1,
            replyCount: 2,
          },
        ],
        depth: 0,
        replyCount: 3,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.comment.id).toBe(rootCommentId);
      expect(result.replies).toHaveLength(1);
      expect(result.replies[0].comment.id).toBe(reply1Id);
      expect(result.replies[0].replies).toHaveLength(2);
      expect(result.replies[0].replies[0].depth).toBe(2);
      expect(result.maxDepth).toBe(2);
    });

    it('should retrieve a single comment thread with no replies', async () => {
      // Arrange
      const commentId = randomUUID();
      const query = new GetCommentThreadQuery(commentId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root comment with no replies'),
        'tenant-1',
        undefined,
        undefined,
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: commentId,
        },
      });

      const threadNode = {
        comment: rootComment,
        replies: [],
        depth: 0,
        replyCount: 0,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.comment.id).toBe(commentId);
      expect(result.replies).toHaveLength(0);
      expect(result.depth).toBe(0);
      expect(result.replyCount).toBe(0);
      expect(result.maxDepth).toBe(0);
    });

    it('should throw CommentNotFoundException when comment does not exist', async () => {
      // Arrange
      const commentId = randomUUID();
      const query = new GetCommentThreadQuery(commentId, 'tenant-1');

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        null,
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        CommentNotFoundException,
      );
      await expect(handler.execute(query)).rejects.toThrow('Comment not found');
    });

    it('should correctly map comment properties to DTO', async () => {
      // Arrange
      const commentId = randomUUID();
      const query = new GetCommentThreadQuery(commentId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Test comment'),
        'tenant-1',
        undefined,
        ['user-2', 'user-3'],
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: commentId,
        },
      });

      const threadNode = {
        comment: rootComment,
        replies: [],
        depth: 0,
        replyCount: 0,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.comment.id).toBe(commentId);
      expect(result.comment.contentId).toBe('content-1');
      expect(result.comment.authorId).toBe('user-1');
      expect(result.comment.content).toEqual({ value: 'Test comment' });
      expect(result.comment.mentions).toEqual(['user-2', 'user-3']);
      expect(result.comment.tenantId).toBe('tenant-1');
      expect(result.comment.parentId).toBeUndefined();
      expect(result.comment.createdAt).toBeDefined();
      expect(result.comment.updatedAt).toBeDefined();
    });

    it('should handle deeply nested threads (max 3 levels)', async () => {
      // Arrange
      const rootId = randomUUID();
      const reply1Id = randomUUID();
      const reply2Id = randomUUID();
      const reply3Id = randomUUID();
      const query = new GetCommentThreadQuery(rootId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root'),
        'tenant-1',
        undefined,
        undefined,
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: rootId,
        },
      });

      const reply1 = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('Level 1'),
        'tenant-1',
        rootId,
        undefined,
      );

      Object.assign(reply1, {
        _props: {
          ...reply1['_props'],
          id: reply1Id,
        },
      });

      const reply2 = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Level 2'),
        'tenant-1',
        reply1Id,
        undefined,
      );

      Object.assign(reply2, {
        _props: {
          ...reply2['_props'],
          id: reply2Id,
        },
      });

      const reply3 = Comment.create(
        'content-1',
        'user-4',
        new CommentContent('Level 3'),
        'tenant-1',
        reply2Id,
        undefined,
      );

      Object.assign(reply3, {
        _props: {
          ...reply3['_props'],
          id: reply3Id,
        },
      });

      const threadNode = {
        comment: rootComment,
        replies: [
          {
            comment: reply1,
            replies: [
              {
                comment: reply2,
                replies: [
                  {
                    comment: reply3,
                    replies: [],
                    depth: 3,
                    replyCount: 0,
                  },
                ],
                depth: 2,
                replyCount: 1,
              },
            ],
            depth: 1,
            replyCount: 2,
          },
        ],
        depth: 0,
        replyCount: 3,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.maxDepth).toBe(3);
      expect(result.replies[0].depth).toBe(1);
      expect(result.replies[0].replies[0].depth).toBe(2);
      expect(result.replies[0].replies[0].replies[0].depth).toBe(3);
    });

    it('should handle thread with multiple root-level replies', async () => {
      // Arrange
      const rootId = randomUUID();
      const query = new GetCommentThreadQuery(rootId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root'),
        'tenant-1',
        undefined,
        undefined,
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: rootId,
        },
      });

      const replies: Comment[] = [];
      for (let i = 0; i < 5; i++) {
        const reply = Comment.create(
          'content-1',
          `user-${i + 2}`,
          new CommentContent(`Reply ${i + 1}`),
          'tenant-1',
          rootId,
          undefined,
        );
        replies.push(reply);
      }

      const threadNode = {
        comment: rootComment,
        replies: replies.map((reply) => ({
          comment: reply,
          replies: [],
          depth: 1,
          replyCount: 0,
        })),
        depth: 0,
        replyCount: 5,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.replies).toHaveLength(5);
      expect(result.replyCount).toBe(5);
      result.replies.forEach((reply, index) => {
        expect(reply.comment.content).toEqual({
          value: `Reply ${index + 1}`,
        });
      });
    });

    it('should correctly count total replies in nested thread', async () => {
      // Arrange
      const rootId = randomUUID();
      const reply1Id = randomUUID();
      const reply2Id = randomUUID();
      const query = new GetCommentThreadQuery(rootId, 'tenant-1');

      const rootComment = Comment.create(
        'content-1',
        'user-1',
        new CommentContent('Root'),
        'tenant-1',
        undefined,
        undefined,
      );

      Object.assign(rootComment, {
        _props: {
          ...rootComment['_props'],
          id: rootId,
        },
      });

      const reply1 = Comment.create(
        'content-1',
        'user-2',
        new CommentContent('Reply 1'),
        'tenant-1',
        rootId,
        undefined,
      );

      Object.assign(reply1, {
        _props: {
          ...reply1['_props'],
          id: reply1Id,
        },
      });

      const reply2 = Comment.create(
        'content-1',
        'user-3',
        new CommentContent('Reply 2'),
        'tenant-1',
        rootId,
        undefined,
      );

      Object.assign(reply2, {
        _props: {
          ...reply2['_props'],
          id: reply2Id,
        },
      });

      const subReply1 = Comment.create(
        'content-1',
        'user-4',
        new CommentContent('Sub-reply'),
        'tenant-1',
        reply1Id,
        undefined,
      );

      const threadNode = {
        comment: rootComment,
        replies: [
          {
            comment: reply1,
            replies: [
              {
                comment: subReply1,
                replies: [],
                depth: 2,
                replyCount: 0,
              },
            ],
            depth: 1,
            replyCount: 1,
          },
          {
            comment: reply2,
            replies: [],
            depth: 1,
            replyCount: 0,
          },
        ],
        depth: 0,
        replyCount: 3,
      };

      (mockThreadService.buildThreadStructure as jest.Mock).mockResolvedValue(
        threadNode,
      );
      (mockThreadService.getThreadMaxDepth as jest.Mock).mockResolvedValue(2);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.replyCount).toBe(3);
      expect(result.replies[0].replyCount).toBe(1);
      expect(result.replies[1].replyCount).toBe(0);
    });
  });
});
