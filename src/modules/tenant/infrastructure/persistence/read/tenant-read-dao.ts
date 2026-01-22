import { Injectable, Inject, Optional, Logger } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import { BaseReadDao } from "@core/infrastructure";
import type { ICacheService } from "@core/infrastructure";
import { CACHE_SERVICE_TOKEN } from "@core/constants";
import type { DrizzleDB } from "@shared/database/drizzle";
import { DATABASE_READ_TOKEN } from "@shared/database/drizzle";
import { tenantsTable } from "../drizzle/schema/tenant.schema";
import type {
  ITenantReadDao,
  TenantReadDto,
  ListTenantsFilter,
  PaginationParams,
  ListTenantsResult,
} from "../../../application/queries/ports/tenant-read-dao.interface";
import type { schema } from "@shared/database/drizzle/schema";

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = "tenant:";

/**
 * Tenant Read DAO Implementation
 *
 * Implements ITenantReadDao for read-optimized queries.
 * Extends BaseReadDao for common functionality.
 *
 * ## Features:
 * - Read replica support (via DATABASE_READ_TOKEN)
 * - Optional caching with automatic invalidation
 * - Optimized queries for read operations
 * - Pagination support
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers
 * - Returns DTOs directly (never domain entities)
 * - Optimized for read operations with minimal overhead
 */
@Injectable()
export class TenantReadDao extends BaseReadDao implements ITenantReadDao {
  private readonly logger = new Logger(TenantReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
    @Optional()
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService?: ICacheService,
  ) {
    super();
  }

  /**
   * Execute raw SQL query (required by BaseReadDao)
   */
  protected async executeQuery<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.db.execute(sql);
    return result.rows as T[];
  }

  /**
   * Find tenant by ID with caching
   */
  async findById(id: string): Promise<TenantReadDto | null> {
    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<TenantReadDto>(
        `${CACHE_KEY_PREFIX}${id}`,
      );
      if (cached) {
        this.logger.debug(`Cache HIT: tenant ${id}`);
        return cached;
      }
    }

    // Query database
    const result = await this.db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, id))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const tenant = this.toDto(result[0]);

    // Cache result
    if (this.cacheService && tenant) {
      await this.cacheService.set(
        `${CACHE_KEY_PREFIX}${id}`,
        tenant,
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached tenant: ${id}`);
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<TenantReadDto | null> {
    const result = await this.db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.tenantId, subdomain))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.toDto(result[0]);
  }

  async findMany(
    filter: ListTenantsFilter,
    pagination: PaginationParams
  ): Promise<ListTenantsResult> {
    const conditions: any[] = [];

    // Apply status filter
    if (filter.status) {
      conditions.push(eq(tenantsTable.status, filter.status));
    }

    // Build query
    let query = this.db.select().from(tenantsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Apply sorting
    const sortBy = filter.sortBy || "createdAt";
    const sortOrder = filter.sortOrder || "DESC";

    if (sortOrder === "DESC") {
      query = query.orderBy(desc(tenantsTable[sortBy])) as any;
    } else {
      query = query.orderBy(tenantsTable[sortBy]) as any;
    }

    // Apply pagination
    query = query
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit) as any;

    const data = await query;

    // Get total count
    const countQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenantsTable);

    const [{ count }] = conditions.length > 0
      ? await countQuery.where(and(...conditions))
      : await countQuery;

    const tenantDtos = data.map((tenant) => this.toDto(tenant));

    return {
      items: tenantDtos,
      total: count,
    };
  }

  /**
   * Invalidate cache for a tenant
   */
  async invalidateCache(id: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.delete(`${CACHE_KEY_PREFIX}${id}`);
      this.logger.debug(`Cache invalidated: tenant ${id}`);
    }
  }

  /**
   * Invalidate cache for multiple tenants
   */
  async invalidateCacheMany(ids: string[]): Promise<void> {
    if (this.cacheService && ids.length > 0) {
      const keys = ids.map((id) => `${CACHE_KEY_PREFIX}${id}`);
      await this.cacheService.mdelete(keys);
      this.logger.debug(`Cache invalidated for ${ids.length} tenants`);
    }
  }

  private toDto(record: any): TenantReadDto {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      status: record.status,
      brandingConfig: record.brandingConfig,
      limits: record.limits,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      deletedAt: record.deletedAt,
    };
  }
}
