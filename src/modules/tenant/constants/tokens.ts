/**
 * Dependency Injection Tokens for Tenant Module
 *
 * Following the Dependency Inversion Principle, these tokens
 * allow interfaces to be injected instead of concrete implementations.
 *
 * Naming Convention:
 * - {MODULE}_{COMPONENT}_TOKEN (e.g., TENANT_REPOSITORY_TOKEN)
 * - Matches the pattern used in the reference project
 */

// Write Repository (for Commands)
export const TENANT_REPOSITORY_TOKEN = 'TENANT_REPOSITORY_TOKEN';

// Read DAO (for Queries)
export const TENANT_READ_DAO_TOKEN = 'TENANT_READ_DAO_TOKEN';

// Domain Services
export const TENANT_UNIQUENESS_CHECKER_TOKEN = 'TENANT_UNIQUENESS_CHECKER_TOKEN';
