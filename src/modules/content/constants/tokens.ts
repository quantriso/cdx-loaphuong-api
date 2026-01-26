/**
 * Dependency Injection Tokens for Content Module
 *
 * Following Dependency Inversion Principle:
 * - Application layer depends on interfaces (ports)
 * - Infrastructure layer provides implementations (adapters)
 */

export const CONTENT_REPOSITORY_TOKEN = Symbol('IContentRepository');
export const CONTENT_READ_DAO_TOKEN = Symbol('IContentReadDao');
export const CONTENT_RULES_CHECKER_TOKEN = Symbol('IContentRulesChecker');
export const CONTENT_HISTORY_TRACKER_TOKEN = Symbol('IContentHistoryTracker');
