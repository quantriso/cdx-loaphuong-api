/**
 * Dependency Injection Tokens for Content Module
 *
 * Following Dependency Inversion Principle:
 * - Application layer depends on interfaces (ports)
 * - Infrastructure layer provides implementations (adapters)
 */

export const CONTENT_REPOSITORY_TOKEN = Symbol('IContentRepository');
export const CONTENT_READ_DAO_TOKEN = Symbol('IContentReadDao');
