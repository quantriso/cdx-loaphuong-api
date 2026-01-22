import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
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
 * Tenant Read DAO Implementation
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers
 * - Returns DTOs directly (never domain entities)
 * - Optimized for read operations with minimal overhead
 * - Can be extended to use read replicas, caching, or denormalized views
 */
@Injectable()
export class TenantReadDao implements ITenantReadDao {
  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>
  ) {}

  async findById(id: string): Promise<TenantReadDto | null> {
    const result = await this.db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, id))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    return this.toDto(result[0]);
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

  async invalidateCache(id: string): Promise<void> {
    // TODO: Epic 7 - Implement cache invalidation
    // For now, this is a no-op
    // In the future, this will invalidate Redis/memory cache
  }

  async invalidateCacheMany(ids: string[]): Promise<void> {
    // TODO: Epic 7 - Implement bulk cache invalidation
    // For now, this is a no-op
    // In the future, this will invalidate Redis/memory cache
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
