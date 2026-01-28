import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from '@core/application';
import { DATABASE_WRITE_TOKEN, EventsHandler, type DrizzleDB } from '@shared';
import { CATEGORY_READ_DAO_TOKEN } from '../../constants/tokens';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../../domain/events';
import { categoriesTable } from '../persistence/drizzle/schema';
import { CategoryReadDao } from '../persistence/read/category-read-dao';
import { eq } from 'drizzle-orm';

/**
 * NestJS Logger adapter for BaseProjection
 * Adapts NestJS Logger to IProjectionLogger interface
 */
class NestProjectionLogger implements IProjectionLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string): void {
    this.logger.log(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(message, trace);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }
}

/**
 * Category Read Model Projection
 *
 * Projection is a critical component in CQRS for synchronizing Read Model
 * when Domain Events are emitted from the Write Side.
 *
 * This projection:
 * 1. Listens to CategoryCreatedEvent, CategoryUpdatedEvent, CategoryDeletedEvent
 * 2. Updates/syncs data (cache, search index, denormalized table)
 * 3. Ensures idempotency (no duplicate event processing)
 *
 * ## Use Cases for Projection:
 * - Update Redis cache when category changes
 * - Sync with Elasticsearch for full-text search
 * - Update denormalized view table for complex queries
 * - Send notifications/webhooks
 *
 * ## Idempotency:
 * - Track processed eventId
 * - Check version before update
 *
 * Story 4.1: Manage Categories - Read Side Synchronization
 *
 * @example
 * // When category is created:
 * // 1. Category.create() → CategoryCreatedEvent
 * // 2. Repository.save() → Publish event
 * // 3. EventBus → Dispatch to Projection
 * // 4. Projection.handle() → Update cache/search/etc.
 */
@Injectable()
@EventsHandler(CategoryCreatedEvent, CategoryUpdatedEvent, CategoryDeletedEvent)
export class CategoryReadModelProjection
  extends BaseProjection<
    CategoryCreatedEvent | CategoryUpdatedEvent | CategoryDeletedEvent
  >
  implements
    IEventHandler<
      CategoryCreatedEvent | CategoryUpdatedEvent | CategoryDeletedEvent
    >
{
  // In-memory event tracking for demo (production should use Redis/DB)
  private processedEvents: Set<string> = new Set();

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(CATEGORY_READ_DAO_TOKEN)
    private readonly categoryReadDao: CategoryReadDao,
  ) {
    super(new NestProjectionLogger('CategoryReadModelProjection'));
  }

  /**
   * Main handle method (required by BaseProjection abstract class)
   * This is the actual projection logic that processes events
   */
  async handle(
    event: CategoryCreatedEvent | CategoryUpdatedEvent | CategoryDeletedEvent,
  ): Promise<void> {
    switch (event.eventType) {
      case 'CategoryCreated':
        await this.onCategoryCreated(event as CategoryCreatedEvent);
        break;

      case 'CategoryUpdated':
        await this.onCategoryUpdated(event as CategoryUpdatedEvent);
        break;

      case 'CategoryDeleted':
        await this.onCategoryDeleted(event as CategoryDeletedEvent);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Override to implement idempotency check
   * Production: Use Redis SETNX or DB table
   */
  protected async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  /**
   * Override to mark event as processed
   */
  protected async markEventProcessed(eventId: string): Promise<void> {
    this.processedEvents.add(eventId);

    // Cleanup old events (keep last 1000)
    if (this.processedEvents.size > 1000) {
      const eventsArray = Array.from(this.processedEvents);
      this.processedEvents = new Set(eventsArray.slice(-500));
    }
  }

  /**
   * Handle CategoryCreatedEvent
   *
   * When category is created:
   * - Add to cache
   * - Index in Elasticsearch
   * - Update aggregate views
   */
  private async onCategoryCreated(event: CategoryCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing CategoryCreatedEvent: ${event.aggregateId} - ${event.data.label}`,
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `New category created: ${JSON.stringify({
        id: event.aggregateId,
        tenantId: event.data.tenantId,
        value: event.data.value,
        label: event.data.label,
        isActive: event.data.isActive,
        parentId: event.data.parentId,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Example: Index in Elasticsearch (pseudo-code)
    // await this.searchClient.index({
    //   index: 'categories',
    //   id: event.aggregateId,
    //   body: event.data,
    // });

    // Example: Update tenant category count (pseudo-code)
    // await this.updateTenantStats(event.data.tenantId, 'increment');
  }

  /**
   * Handle CategoryUpdatedEvent
   *
   * Story 4.1: Manage Categories - Update
   *
   * When category is updated:
   * - Update cache with new data
   * - Re-index in Elasticsearch
   * - Invalidate related queries
   */
  private async onCategoryUpdated(event: CategoryUpdatedEvent): Promise<void> {
    this.logger.log(
      `Processing CategoryUpdatedEvent: ${event.aggregateId} - ${event.data.label}`,
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `Category updated: ${JSON.stringify({
        id: event.aggregateId,
        tenantId: event.data.tenantId,
        updatedBy: event.data.updatedBy,
        label: event.data.label,
        isActive: event.data.isActive,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Invalidate cache
    await this.categoryReadDao.invalidateCache(event.aggregateId);

    // Example: Re-index in Elasticsearch (pseudo-code)
    // await this.searchClient.update({
    //   index: 'categories',
    //   id: event.aggregateId,
    //   body: {
    //     doc: {
    //       label: event.data.label,
    //       description: event.data.description,
    //       isActive: event.data.isActive,
    //       updatedAt: event.data.updatedAt,
    //     },
    //   },
    // });
  }

  /**
   * Handle CategoryDeletedEvent
   *
   * Story 4.1: Manage Categories - Delete
   *
   * When category is deleted:
   * - Invalidate cache
   * - Update search index
   * - Update related content
   */
  private async onCategoryDeleted(event: CategoryDeletedEvent): Promise<void> {
    this.logger.log(
      `Processing CategoryDeletedEvent: ${event.aggregateId} - ${event.data.value}`,
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `Category deleted: ${JSON.stringify({
        id: event.aggregateId,
        tenantId: event.data.tenantId,
        value: event.data.value,
        deletedBy: event.data.deletedBy,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Invalidate cache
    await this.categoryReadDao.invalidateCache(event.aggregateId);

    // Example: Remove from search index (pseudo-code)
    // await this.searchClient.delete({
    //   index: 'categories',
    //   id: event.aggregateId,
    // });

    // Example: Update content that references this category (pseudo-code)
    // await this.contentService.handleCategoryDeleted(event.aggregateId);
  }
}
