import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

// Core imports
import type { IEventBus, IOutboxRepository } from '@core/infrastructure';
import { ConcurrencyException } from '@core/common';
import { OUTBOX_REPOSITORY_TOKEN } from '@core/constants';

// Shared imports
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from '@shared';

// Domain imports
import { Tag } from '../../../domain/entities';
import { ITagRepository } from '../../../domain/repositories';

// Infrastructure imports
import { tagsTable, type TagRecord } from '../drizzle/schema';

/**
 * Tag Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements ITagRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * Story 4.3: Create, Edit, Delete Tags
 *
 * ## CQRS Note
 * This repository is for WRITE operations only.
 * For READ operations (queries, search), use TagReadDao.
 */
@Injectable()
export class TagRepository
  extends BaseAggregateRepository<Tag>
  implements ITagRepository
{
  private readonly logger = new Logger(TagRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
    @Optional()
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    outboxRepository?: IOutboxRepository,
  ) {
    super(eventBus, outboxRepository, {
      useOutbox: false, // Let Command Handler decide via save options
    });
  }

  /**
   * Persist aggregate to database with Optimistic Concurrency Control
   */
  protected async persist(
    aggregate: Tag,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      await db.insert(tagsTable).values(persistenceModel);
      this.logger.debug(`Tag created: ${aggregate.id}`);
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(tagsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(tagsTable.id, aggregate.id),
            eq(tagsTable.version, expectedVersion),
          ),
        )
        .returning({ id: tagsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
      this.logger.debug(`Tag updated: ${aggregate.id}`);
    }
  }

  /**
   * Get aggregate by ID for modification
   */
  async getById(id: string): Promise<Tag | null> {
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.id, id), eq(tagsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Delete aggregate (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(tagsTable).where(eq(tagsTable.id, id));
    this.logger.debug(`Tag deleted: ${id}`);
  }

  /**
   * Find tag by slug within a tenant
   */
  async findBySlug(tenantId: string, slug: string): Promise<Tag | null> {
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.tenantId, tenantId),
          eq(tagsTable.slug, slug),
          eq(tagsTable.isDeleted, false),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Check if tag slug exists within a tenant
   */
  async existsBySlug(tenantId: string, slug: string): Promise<boolean> {
    const result = await this.db
      .select({ id: tagsTable.id })
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.tenantId, tenantId),
          eq(tagsTable.slug, slug),
          eq(tagsTable.isDeleted, false),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find all active tags for a tenant
   */
  async findActiveTags(tenantId: string): Promise<Tag[]> {
    const result = await this.db
      .select()
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.tenantId, tenantId),
          eq(tagsTable.isActive, true),
          eq(tagsTable.isDeleted, false),
        ),
      );

    return result.map((row) => this.toDomain(row));
  }

  /**
   * Count tags for a tenant
   */
  async countByTenantId(tenantId: string): Promise<number> {
    const result = await this.db
      .select({ id: tagsTable.id })
      .from(tagsTable)
      .where(
        and(eq(tagsTable.tenantId, tenantId), eq(tagsTable.isDeleted, false)),
      );

    return result.length;
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: Tag): TagRecord {
    return {
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      name: aggregate.name,
      slug: aggregate.slug,
      description: aggregate.description ?? null,
      color: aggregate.color ?? null,
      category: aggregate.category,
      synonyms: aggregate.synonyms,
      isActive: aggregate.isActive,
      usageCount: aggregate.usageCount,
      metadata: aggregate.metadata ?? null,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt,
      deletedBy: aggregate.deletedBy,
      version: aggregate.version,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Map Persistence Model to Domain Entity
   */
  private toDomain(row: TagRecord): Tag {
    return Tag.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      color: row.color ?? undefined,
      category: row.category as any, // Will be validated by entity
      synonyms: row.synonyms || [],
      isActive: row.isActive,
      usageCount: row.usageCount || 0,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      version: row.version || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy ?? null,
    });
  }
}
