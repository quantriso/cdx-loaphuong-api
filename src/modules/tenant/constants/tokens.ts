/**
 * Dependency Injection Tokens for Tenant Module
 *
 * Following the Dependency Inversion Principle, these tokens
 * allow interfaces to be injected instead of concrete implementations.
 *
 * Using Symbol tokens for:
 * - Better type safety
 * - Avoiding naming conflicts
 * - Following reference project pattern
 *
 * Naming Convention:
 * - Symbol('InterfaceName') matches the interface name
 * - Follows the pattern used in the reference project
 */

// Write Repository (for Commands)
export const TENANT_REPOSITORY_TOKEN = Symbol('ITenantRepository');

// Read DAO (for Queries)
export const TENANT_READ_DAO_TOKEN = Symbol('ITenantReadDao');

// Domain Services
export const TENANT_UNIQUENESS_CHECKER_TOKEN = Symbol(
  'ITenantUniquenessChecker',
);
