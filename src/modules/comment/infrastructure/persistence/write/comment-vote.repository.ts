import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_WRITE_TOKEN, type DrizzleDB } from '@shared';
import * as schema from '../drizzle/schema/comment-vote.schema';
import { CommentVote } from '../../../domain/entities/comment-vote.entity';
import { CommentVoteId } from '../../../domain/value-objects/comment-vote-id.value-object';
import { CommentId } from '../../../domain/value-objects/comment-id.value-object';
import { VoteType } from '../../../domain/value-objects/vote-type.enum';
import { eq, and, isNull } from 'drizzle-orm';
import type { ICommentVoteRepository } from '../../../domain/repositories/comment-vote.repository.interface';

/**
 * Comment Vote Repository Implementation
 *
 * Story 6.3: Like/dislike comments
 *
 * Implements ICommentVoteRepository using Drizzle ORM.
 * Handles persistence of CommentVote aggregates and provides query capabilities.
 */
@Injectable()
export class CommentVoteRepository implements ICommentVoteRepository {
  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  async save(vote: CommentVote): Promise<void> {
    await this.db.insert(schema.commentVotes).values({
      id: vote.getId(),
      commentId: vote.getCommentId(),
      userId: vote.userId,
      voteType: vote.voteType.valueOf() as 'LIKE' | 'DISLIKE',
      votedAt: vote.votedAt,
    });
  }

  async update(vote: CommentVote): Promise<void> {
    await this.db
      .update(schema.commentVotes)
      .set({
        voteType: vote.voteType.valueOf() as 'LIKE' | 'DISLIKE',
        votedAt: vote.votedAt,
      })
      .where(eq(schema.commentVotes.id, vote.getId()));
  }

  async delete(voteId: CommentVoteId): Promise<void> {
    await this.db
      .delete(schema.commentVotes)
      .where(eq(schema.commentVotes.id, voteId.value));
  }

  async findById(voteId: CommentVoteId): Promise<CommentVote | null> {
    const result = await this.db
      .select()
      .from(schema.commentVotes)
      .where(eq(schema.commentVotes.id, voteId.value))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByCommentAndUserId(
    commentId: CommentId,
    userId: string,
  ): Promise<CommentVote | null> {
    const result = await this.db
      .select()
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId.value),
          eq(schema.commentVotes.userId, userId),
          isNull(schema.commentVotes.deletedAt),
        ),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByCommentId(commentId: CommentId): Promise<CommentVote[]> {
    const results = await this.db
      .select()
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId.value),
          isNull(schema.commentVotes.deletedAt),
        ),
      );

    return results.map((row) => this.mapToEntity(row));
  }

  async countByCommentIdAndType(
    commentId: CommentId,
    voteType: 'LIKE' | 'DISLIKE',
  ): Promise<number> {
    const result = await this.db
      .select({ count: schema.commentVotes.id })
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId.value),
          eq(schema.commentVotes.voteType, voteType),
          isNull(schema.commentVotes.deletedAt),
        ),
      );

    return result.length;
  }

  async existsByCommentAndUserId(
    commentId: CommentId,
    userId: string,
  ): Promise<boolean> {
    const result = await this.db
      .select({ count: schema.commentVotes.id })
      .from(schema.commentVotes)
      .where(
        and(
          eq(schema.commentVotes.commentId, commentId.value),
          eq(schema.commentVotes.userId, userId),
          isNull(schema.commentVotes.deletedAt),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  private mapToEntity(row: any): CommentVote {
    const voteType = row.voteType === 'LIKE' ? VoteType.LIKE : VoteType.DISLIKE;

    return CommentVote.reconstitute(
      CommentVoteId.fromString(row.id),
      CommentId.fromString(row.commentId),
      row.userId,
      voteType,
      new Date(row.votedAt),
    );
  }
}
