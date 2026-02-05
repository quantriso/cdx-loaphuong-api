/**
 * Dependency Injection Tokens for Comment Module
 *
 * Story 6.1: Add comments on published content
 * Story 6.2: Reply to comment
 * Story 6.3: Like/dislike comment
 *
 * Following Dependency Inversion Principle:
 * - Application layer depends on interfaces (ports)
 * - Infrastructure layer provides implementations (adapters)
 */

export const COMMENT_REPOSITORY_TOKEN = Symbol('ICommentRepository');
export const COMMENT_READ_DAO_TOKEN = Symbol('ICommentReadDao');
export const COMMENT_VOTE_REPOSITORY_TOKEN = Symbol('ICommentVoteRepository');
export const COMMENT_VOTE_READ_DAO_TOKEN = Symbol('ICommentVoteReadDao');
export const COMMENT_VALIDATION_SERVICE_TOKEN = Symbol(
  'ICommentValidationService',
);
export const CONTENT_SERVICE_TOKEN = Symbol('IContentService');
export const CONTENT_AVAILABILITY_CHECKER_TOKEN = Symbol(
  'IContentAvailabilityChecker',
);
export const CONTENT_AVAILABILITY_SERVICE_TOKEN = Symbol(
  'ContentAvailabilityService',
);
export const THREAD_SERVICE_TOKEN = Symbol('IThreadService');
