/**
 * Dependency Injection Tokens for Comment Module
 *
 * Story 6.1: Add comments on published content
 *
 * Following Dependency Inversion Principle:
 * - Application layer depends on interfaces (ports)
 * - Infrastructure layer provides implementations (adapters)
 */

export const COMMENT_REPOSITORY_TOKEN = Symbol('ICommentRepository');
export const COMMENT_READ_DAO_TOKEN = Symbol('ICommentReadDao');
export const COMMENT_VALIDATION_SERVICE_TOKEN = Symbol(
  'ICommentValidationService',
);
export const CONTENT_SERVICE_TOKEN = Symbol('IContentService');
