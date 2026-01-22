/**
 * Tenant Read DAO Interface (Port)
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers (never by Command Handlers)
 * - Returns DTOs (never domain entities)
 * - Optimized for read operations
 * - Can use denormalized data, views, or read replicas
 *
 * Location: application/queries/ports/ (following CQRS pattern)
 * Defined in Application Layer, implemented in Infrastructure.
 *
 * Tuân theo Dependency Inversion Principle:
 * - Application layer định nghĩa interface (Port)
 * - Infrastructure layer implement (Adapter)
 * - Application layer không phụ thuộc vào Infrastructure
 *
 * ## CQRS Note
 * This interface is for READ operations only.
 * Write operations go through ITenantRepository (Write Side).
 */

export interface TenantReadDto {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  brandingConfig: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    [key: string]: any;
  } | null;
  limits: {
    maxUsers?: number;
    maxContent?: number;
    maxStorage?: number;
    [key: string]: any;
  } | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
}

export interface ListTenantsFilter {
  status?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "status";
  sortOrder?: "ASC" | "DESC";
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ListTenantsResult {
  items: TenantReadDto[];
  total: number;
}

export interface ITenantReadDao {
  /**
   * Find tenant by ID
   *
   * @param id Tenant ID
   * @returns TenantReadDto or null if not found
   */
  findById(id: string): Promise<TenantReadDto | null>;

  /**
   * Find tenant by subdomain
   *
   * @param subdomain Tenant subdomain (stored as tenantId)
   * @returns TenantReadDto or null if not found
   */
  findBySubdomain(subdomain: string): Promise<TenantReadDto | null>;

  /**
   * Find many tenants with pagination and filters
   *
   * @param filter Filter options
   * @param pagination Pagination options
   * @returns ListTenantsResult with items and total count
   */
  findMany(
    filter: ListTenantsFilter,
    pagination: PaginationParams
  ): Promise<ListTenantsResult>;

  /**
   * Invalidate cache for a specific tenant
   *
   * @param id Tenant ID
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Invalidate cache for multiple tenants
   *
   * @param ids Tenant IDs
   */
  invalidateCacheMany(ids: string[]): Promise<void>;
}
