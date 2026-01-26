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
import { Content } from '../../../domain/entities';
import { IContentRepository } from '../../../domain/repositories';
import {
  ContentStatus,
  ContentType,
  ContentPriority,
} from '../../../domain/value-objects';

// Infrastructure imports
import { contentsTable, type ContentRecord } from '../drizzle/schema';

/**
 * Content Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements IContentRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * Story 3.1: Create Content Draft
 *
 * ## CQRS Note
 * This repository is for WRITE operations only.
 * For READ operations (queries, search), use ContentReadDao.
 */
@Injectable()
export class ContentRepository
  extends BaseAggregateRepository<Content>
  implements IContentRepository
{
  private readonly logger = new Logger(ContentRepository.name);

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
    aggregate: Content,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      await db.insert(contentsTable).values(persistenceModel);
      this.logger.debug(`Content created: ${aggregate.id}`);
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(contentsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(contentsTable.id, aggregate.id),
            eq(contentsTable.version, expectedVersion),
          ),
        )
        .returning({ id: contentsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
      this.logger.debug(`Content updated: ${aggregate.id}`);
    }
  }

  /**
   * Get aggregate by ID for modification
   */
  async getById(id: string): Promise<Content | null> {
    const result = await this.db
      .select()
      .from(contentsTable)
      .where(eq(contentsTable.id, id))
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
    await this.db.delete(contentsTable).where(eq(contentsTable.id, id));
    this.logger.debug(`Content deleted: ${id}`);
  }

  /**
   * Check if content exists by ID and tenant
   */
  async existsById(id: string, tenantId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: contentsTable.id })
      .from(contentsTable)
      .where(
        and(eq(contentsTable.id, id), eq(contentsTable.tenantId, tenantId)),
      )
      .limit(1);

    return result.length > 0;
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: Content): ContentRecord {
    return {
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      authorId: aggregate.authorId,
      title: aggregate.title,
      content: aggregate.content,
      excerpt: aggregate.excerpt,
      status: aggregate.status.toString() as any,
      type: aggregate.type.toString() as any,
      priority: aggregate.priority.toString() as any,
      categoryId: aggregate.categoryId,
      tags: aggregate.tags as any,
      featuredImage: aggregate.featuredImage,
      version: aggregate.version,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  /**
   * Map Persistence Model to Domain Entity
   */
  private toDomain(row: ContentRecord): Content {
    return Content.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      type: ContentType.fromValue(row.type),
      status: ContentStatus.fromValue(row.status),
      priority: ContentPriority.fromValue(row.priority),
      categoryId: row.categoryId,
      tags: (row.tags as string[]) || [],
      featuredImage: row.featuredImage,
      version: row.version || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
