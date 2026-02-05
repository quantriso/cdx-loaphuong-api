import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { BaseReadDao } from '@core/infrastructure';
import type { ICacheService } from '@core/infrastructure';
import { CACHE_SERVICE_TOKEN } from '@core/constants';
import type { DrizzleDB } from '@shared/database/drizzle';
import { DATABASE_READ_TOKEN } from '@shared/database/drizzle';
import { commentVotes } from '../drizzle/schema/comment-vote.schema';
import type { ICommentVoteReadDaoPort } from '../../../application/queries/ports/comment-vote-read-dao.interface';
import type { CommentVoteDto } from '../../../application/dtos/comment-vote.dto';
import type { schema } from '@shared/database/drizzle/schema';

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'comment-vote:';

/**
 * Comment Vote Read DAO Implementation
 *
 * Implements ICommentVoteReadDaoPort for read-optimized queries.
 * Extends BaseReadDao for common functionality.
 *
 * ## Features:
 * - Read replica support (via DATABASE_READ_TOKEN)
 * - Optional caching with automatic invalidation
 * - Optimized queries for read operations
 * - Vote counting with grouping
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers
 * - Returns DTOs directly (never domain entities)
 * - Optimized for read operations with minimal overhead
 */
@Injectable()
export class CommentVoteReadDao
  extends BaseReadDao
  implements ICommentVoteReadDaoPort
{
  private readonly logger = new Logger(CommentVoteReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    super();
  }

  /**
   * Execute raw SQL query (required by BaseReadDao)
   */
  protected async executeQuery<T = unknown>(
    sqlQuery: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.db.execute(sqlQuery);
    return result.rows as T[];
  }

  /**
   * Find all votes for a specific comment
   */
  async findByCommentId(commentId: string): Promise<CommentVoteDto[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}comment:${commentId}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<CommentVoteDto[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: comment votes ${commentId}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId))
      .orderBy(desc(commentVotes.votedAt));

    const votes = result.map((vote) => this.toDto(vote));

    // Cache result
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, votes, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached comment votes: ${commentId}`);
    }

    return votes;
  }

  /**
   * Find all votes by a specific user
   */
  async findByUserId(userId: string): Promise<CommentVoteDto[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}user:${userId}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<CommentVoteDto[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: user votes ${userId}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(commentVotes)
      .where(eq(commentVotes.userId, userId))
      .orderBy(desc(commentVotes.votedAt));

    const votes = result.map((vote) => this.toDto(vote));

    // Cache result
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, votes, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached user votes: ${userId}`);
    }

    return votes;
  }

  /**
   * Find a specific vote by comment and user
   */
  async findByCommentAndUserId(
    commentId: string,
    userId: string,
  ): Promise<CommentVoteDto | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${commentId}:${userId}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<CommentVoteDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: vote ${commentId}:${userId}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(commentVotes)
      .where(
        and(
          eq(commentVotes.commentId, commentId),
          eq(commentVotes.userId, userId),
        ),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const vote = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && vote) {
      await this.cacheService.set(cacheKey, vote, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached vote: ${commentId}:${userId}`);
    }

    return vote;
  }

  /**
   * Count votes for a comment, grouped by type
   */
  async countByCommentId(commentId: string): Promise<{
    likeCount: number;
    dislikeCount: number;
  }> {
    const cacheKey = `${CACHE_KEY_PREFIX}count:${commentId}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<{
        likeCount: number;
        dislikeCount: number;
      }>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: vote counts ${commentId}`);
        return cached;
      }
    }

    // Query database with grouping
    const result = await this.db
      .select({
        voteType: commentVotes.voteType,
        count: sql<number>`count(*)::int`,
      })
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId))
      .groupBy(commentVotes.voteType);

    // Initialize counts
    let likeCount = 0;
    let dislikeCount = 0;

    // Extract counts from result
    for (const row of result) {
      if (row.voteType === 'LIKE') {
        likeCount = row.count;
      } else if (row.voteType === 'DISLIKE') {
        dislikeCount = row.count;
      }
    }

    const counts = { likeCount, dislikeCount };

    // Cache result
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, counts, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached vote counts: ${commentId}`);
    }

    return counts;
  }

  /**
   * Count votes of a specific type for a comment
   */
  async countByCommentIdAndType(
    commentId: string,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<number> {
    const cacheKey = `${CACHE_KEY_PREFIX}count:${commentId}:${voteType}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<number>(cacheKey);
      if (cached !== null && cached !== undefined) {
        this.logger.debug(`Cache HIT: vote count ${commentId}:${voteType}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(commentVotes)
      .where(
        and(
          eq(commentVotes.commentId, commentId),
          eq(commentVotes.voteType, voteType),
        ),
      );

    const count = result[0]?.count || 0;

    // Cache result
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, count, CACHE_TTL_SECONDS);
      this.logger.debug(`Cached vote count: ${commentId}:${voteType}`);
    }

    return count;
  }

  /**
   * Invalidate cache for votes of a specific comment
   */
  async invalidateCache(commentId: string): Promise<void> {
    if (this.cacheService) {
      // Invalidate all cache keys related to this comment
      const keys = [
        `${CACHE_KEY_PREFIX}comment:${commentId}`,
        `${CACHE_KEY_PREFIX}count:${commentId}`,
        `${CACHE_KEY_PREFIX}count:${commentId}:LIKE`,
        `${CACHE_KEY_PREFIX}count:${commentId}:DISLIKE`,
      ];

      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for comment votes: ${commentId}`);
    }
  }

  /**
   * Convert database record to DTO
   */
  private toDto(record: any): CommentVoteDto {
    return {
      id: record.id,
      commentId: record.commentId,
      userId: record.userId,
      voteType: record.voteType,
      createdAt: record.votedAt,
    };
  }
}
