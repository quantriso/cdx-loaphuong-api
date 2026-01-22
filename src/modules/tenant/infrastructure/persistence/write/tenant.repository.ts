import { Injectable, Inject, Optional, Logger } from "@nestjs/common";
import { eq, and } from "drizzle-orm";

// Import from Core (interfaces only)
import type {
  IEventBus,
  IOutboxRepository,
} from "@core/infrastructure";
import { ConcurrencyException } from "@core/common";
import { OUTBOX_REPOSITORY_TOKEN } from "@core/constants";

// Import from Shared (implementations)
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from "@shared";

// Import Domain & Ports
import { Tenant } from "../../../domain/entities";
import { ITenantRepository } from "../../../domain/repositories";

// Import Infrastructure (Schema & Config)
import { tenantsTable, type TenantRecord } from "../drizzle/schema";
import { TenantStatus } from "../../../domain/value-objects";

/**
 * Tenant Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements ITenantRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * ## CQRS Note
 *
 * This repository is for WRITE operations only:
 * - save() - Persist aggregate with events
 * - getById() - Load aggregate for modification
 * - delete() - Remove aggregate
 * - existsBySubdomain() - Support uniqueness validation
 *
 * For READ operations (queries, search, statistics), use TenantReadDao.
 *
 * ## Event Publishing Strategy
 *
 * - With OutboxRepository: Uses Transactional Outbox Pattern (recommended)
 * - Without OutboxRepository: Uses direct event publishing (simpler but less reliable)
 *
 * ## Transactional Outbox Pattern
 *
 * When enabled, events are stored in the same transaction as the aggregate.
 * A separate worker (OutboxProcessor) polls and publishes events.
 * This guarantees at-least-once delivery even if the application crashes.
 */
@Injectable()
export class TenantRepository
  extends BaseAggregateRepository<Tenant>
  implements ITenantRepository
{
  private readonly logger = new Logger(TenantRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
    @Optional()
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    outboxRepository?: IOutboxRepository,
  ) {
    // Enable outbox pattern if outboxRepository is provided
    super(eventBus, outboxRepository, {
      useOutbox: false, // Default to false, let Command Handler decide via save options
    });
  }

  /**
   * Persist aggregate to database with Optimistic Concurrency Control
   */
  protected async persist(
    aggregate: Tenant,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      await db.insert(tenantsTable).values(persistenceModel);
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(tenantsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(tenantsTable.id, aggregate.id),
            eq(tenantsTable.version, expectedVersion),
          ),
        )
        .returning({ id: tenantsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  /**
   * Get aggregate by ID for modification
   */
  async getById(id: string): Promise<Tenant | null> {
    const result = await this.db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Delete aggregate (hard delete)
   *
   * Note: For soft delete, use tenant.softDelete() method instead.
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(tenantsTable).where(eq(tenantsTable.id, id));
  }

  /**
   * Check if subdomain exists (for uniqueness validation)
   *
   * More efficient than loading the full aggregate when you only need existence check.
   */
  async existsBySubdomain(subdomain: string): Promise<boolean> {
    const result = await this.db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.tenantId, subdomain))
      .limit(1);

    return result.length > 0;
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: Tenant): TenantRecord {
    return {
      id: aggregate.id,
      tenantId: aggregate.subdomain,
      name: aggregate.name,
      adminEmail: aggregate.adminEmail,
      adminPasswordHash: aggregate.adminPasswordHash,
      status: aggregate.status,
      brandingConfig: aggregate.brandingConfig as any,
      limits: aggregate.limits as any,
      createdBy: aggregate.createdBy,
      deletedAt: aggregate.deletedAt,
      version: aggregate.version,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  /**
   * Map Persistence Model to Domain Entity
   */
  private toDomain(row: TenantRecord): Tenant {
    return Tenant.reconstitute({
      id: row.id,
      name: row.name,
      subdomain: row.tenantId,
      adminEmail: row.adminEmail,
      status: row.status as TenantStatus,
      adminPasswordHash: row.adminPasswordHash,
      brandingConfig: row.brandingConfig as any,
      limits: row.limits as any,
      createdBy: row.createdBy,
      deletedAt: row.deletedAt,
      version: row.version || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
