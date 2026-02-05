/**
 * Comment Module - Read Persistence Layer
 *
 * Exports all read-side data access objects (DAOs) for the Comment module.
 * These DAOs implement CQRS pattern for optimized read operations.
 *
 * ## Pattern
 * - CQRS (Command Query Responsibility Segregation)
 * - Read-optimized queries
 * - Caching support
 * - Read replica support
 */

export { CommentReadDao } from './comment-read-dao';
export type { ICommentReadDaoPort } from '../../../application/queries/ports/comment-read-dao.interface';

export { CommentVoteReadDao } from './comment-vote-read-dao';
export type { ICommentVoteReadDaoPort } from '../../../application/queries/ports/comment-vote-read-dao.interface';
