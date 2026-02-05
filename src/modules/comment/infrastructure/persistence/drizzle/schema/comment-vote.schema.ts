import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { comments } from './comment.schema';

/**
 * Comment Votes Table
 * Stores user votes (likes/dislikes) on comments
 */
export const commentVotes = pgTable(
  'comment_votes',
  {
    // Primary key - varchar to match other entities in the system
    id: varchar('id', { length: 25 }).primaryKey().notNull(),

    // Foreign key to comments table
    commentId: varchar('comment_id', { length: 25 })
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),

    // User who cast the vote
    userId: varchar('user_id', { length: 25 }).notNull(),

    // Vote type: LIKE or DISLIKE
    voteType: varchar('vote_type', { length: 10 })
      .$type<'LIKE' | 'DISLIKE'>()
      .notNull(),

    // Timestamps
    votedAt: timestamp('voted_at').notNull().defaultNow(),

    // Soft delete flag
    deletedAt: timestamp('deleted_at'),

    // Version for optimistic concurrency control
    version: integer('version').notNull().default(1),
  },
  (table) => ({
    // Index for querying votes by comment
    commentIdIdx: index('idx_comment_votes_comment_id').on(table.commentId),
    // Index for querying votes by user
    userIdIdx: index('idx_comment_votes_user_id').on(table.userId),
    // Index for querying votes by comment and user (for uniqueness check)
    commentUserIdx: index('idx_comment_votes_comment_user').on(
      table.commentId,
      table.userId,
    ),
  }),
);

// Unique constraint to ensure a user can only vote once on a comment
export const commentVotesUniqueConstraint = sql`CREATE UNIQUE INDEX IF NOT EXISTS comment_votes_unique_comment_user ON comment_votes (comment_id, user_id) WHERE deleted_at IS NULL`;
