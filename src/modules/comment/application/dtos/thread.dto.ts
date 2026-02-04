import { CommentDto } from './comment.dto';

/**
 * Comment Thread Node DTO
 *
 * Represents a comment in a thread structure with its replies.
 * Used for hierarchical display of comment conversations.
 */
export interface CommentThreadNodeDto {
  comment: CommentDto;
  replies: CommentThreadNodeDto[];
  depth: number;
  replyCount: number;
}

/**
 * Comment Thread DTO
 *
 * Response DTO for a complete comment thread including
 * all replies organized hierarchically.
 */
export interface CommentThreadDto {
  comment: CommentDto;
  replies: CommentThreadNodeDto[];
  depth: number;
  replyCount: number;
  maxDepth: number;
}
