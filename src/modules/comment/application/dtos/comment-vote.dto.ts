import { VoteType } from '../../domain/value-objects/vote-type.enum';

/**
 * DTO for comment vote
 *
 * Story 6.3: Like/dislike comment
 */
export class CommentVoteDto {
  id: string;
  commentId: string;
  userId: string;
  voteType: VoteType;
  createdAt: Date;
}

/**
 * DTO for vote request
 *
 * Story 6.3: Like/dislike comment
 */
export class VoteRequestDto {
  userId: string;
  voteType: VoteType;
}

/**
 * DTO for vote response
 *
 * Story 6.3: Like/dislike comment
 */
export class VoteResponseDto {
  commentId: string;
  likeCount: number;
  dislikeCount: number;
  userVote: VoteType | null;
}
