import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';

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
import { Category } from '../../../domain/entities';
import { ICategoryRepository } from '../../../domain/repositories';

// Infrastructure imports
import { categoriesTable, type CategoryRecord } from '../drizzle/schema';

/**
 * Category Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements ICategoryRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * Story 4.1: Manage Categories
 *
 * ## CQRS Note
 * This repository is for WRITE operations only.
 * For READ operations (queries, search), use CategoryReadDao.
 */
@Injectable()
export class CategoryRepository
  extends BaseAggregateRepository<Category>
  implements ICategoryRepository
{
  private readonly logger = new Logger(CategoryRepository.name);

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
    aggregate: Category,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      await db.insert(categoriesTable).values(persistenceModel);
      this.logger.debug(`Category created: ${aggregate.id}`);
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(categoriesTable)
        .set(persistenceModel)
        .where(
          and(
            eq(categoriesTable.id, aggregate.id),
            eq(categoriesTable.version, expectedVersion),
          ),
        )
        .returning({ id: categoriesTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
      this.logger.debug(`Category updated: ${aggregate.id}`);
    }
  }

  /**
   * Get aggregate by ID for modification
   */
  async getById(id: string): Promise<Category | null> {
    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.id, id), eq(categoriesTable.isDeleted, false)),
      )
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
    await this.db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    this.logger.debug(`Category deleted: ${id}`);
  }

  /**
   * Find category by value within a tenant
   */
  async findByValue(tenantId: string, value: string): Promise<Category | null> {
    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.tenantId, tenantId),
          eq(categoriesTable.value, value),
          eq(categoriesTable.isDeleted, false),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Find categories by parent ID
   */
  async findByParentId(
    parentId: string | null,
    tenantId: string,
  ): Promise<Category[]> {
    const condition =
      parentId === null
        ? and(
            eq(categoriesTable.tenantId, tenantId),
            isNull(categoriesTable.parentId),
            eq(categoriesTable.isDeleted, false),
          )
        : and(
            eq(categoriesTable.tenantId, tenantId),
            eq(categoriesTable.parentId, parentId),
            eq(categoriesTable.isDeleted, false),
          );

    const result = await this.db
      .select()
      .from(categoriesTable)
      .where(condition);

    return result.map((row) => this.toDomain(row));
  }

  /**
   * Check if category value exists within a tenant
   */
  async existsByValue(tenantId: string, value: string): Promise<boolean> {
    const result = await this.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.tenantId, tenantId),
          eq(categoriesTable.value, value),
          eq(categoriesTable.isDeleted, false),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Count children of a category
   */
  async countChildren(parentId: string, tenantId: string): Promise<number> {
    const result = await this.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.tenantId, tenantId),
          eq(categoriesTable.parentId, parentId),
          eq(categoriesTable.isDeleted, false),
        ),
      );

    return result.length;
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: Category): CategoryRecord {
    return {
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      value: aggregate.value,
      label: aggregate.label,
      description: aggregate.description ?? null,
      color: aggregate.color ?? null,
      icon: aggregate.icon ?? null,
      isActive: aggregate.isActive,
      parentId: aggregate.parentId,
      sortOrder: aggregate.sortOrder,
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
  private toDomain(row: CategoryRecord): Category {
    return Category.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      value: row.value,
      label: row.label,
      description: row.description ?? undefined,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      isActive: row.isActive,
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      version: row.version || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    });
  }
}
