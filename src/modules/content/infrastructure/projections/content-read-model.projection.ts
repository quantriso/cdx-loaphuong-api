import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from "@core/application";
import {
  DATABASE_WRITE_TOKEN,
  EventsHandler,
  type DrizzleDB,
} from "@shared";
import { CONTENT_READ_DAO_TOKEN } from "../../constants/tokens";
import { ContentCreatedEvent, ContentUpdatedEvent } from "../../domain/events";
import { contentsTable } from "../persistence/drizzle/schema";
import { ContentReadDao } from "../persistence/read/content-read-dao";
import { eq } from "drizzle-orm";

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
 * Content Read Model Projection
 *
 * Projection is a critical component in CQRS for synchronizing Read Model
 * when Domain Events are emitted from the Write Side.
 *
 * This projection:
 * 1. Listens to ContentCreatedEvent, ContentUpdatedEvent (and future events)
 * 2. Updates/syncs data (cache, search index, denormalized table)
 * 3. Ensures idempotency (no duplicate event processing)
 *
 * ## Use Cases for Projection:
 * - Update Redis cache when content changes
 * - Sync with Elasticsearch for full-text search
 * - Update denormalized view table for complex queries
 * - Send notifications/webhooks
 *
 * ## Idempotency:
 * - Track processed eventId
 * - Check version before update
 *
 * Story 3.1: Create Content Draft - Read Side Synchronization
 * Story 3.2: Update Content - Read Side Synchronization
 *
 * @example
 * // When content is created:
 * // 1. Content.create() → ContentCreatedEvent
 * // 2. Repository.save() → Publish event
 * // 3. EventBus → Dispatch to Projection
 * // 4. Projection.handle() → Update cache/search/etc.
 */
@Injectable()
@EventsHandler(ContentCreatedEvent, ContentUpdatedEvent)
export class ContentReadModelProjection
  extends BaseProjection<ContentCreatedEvent | ContentUpdatedEvent>
  implements IEventHandler<ContentCreatedEvent | ContentUpdatedEvent>
{
  // In-memory event tracking for demo (production should use Redis/DB)
  private processedEvents: Set<string> = new Set();

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(CONTENT_READ_DAO_TOKEN)
    private readonly contentReadDao: ContentReadDao
  ) {
    super(new NestProjectionLogger("ContentReadModelProjection"));
  }

  /**
   * Main handle method (required by BaseProjection abstract class)
   * This is the actual projection logic that processes events
   */
  async handle(event: ContentCreatedEvent | ContentUpdatedEvent): Promise<void> {
    switch (event.eventType) {
      case "ContentCreated":
        await this.onContentCreated(event as ContentCreatedEvent);
        break;

      case "ContentUpdated":
        await this.onContentUpdated(event as ContentUpdatedEvent);
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
   * Handle ContentCreatedEvent
   *
   * When content is created:
   * - Add to cache
   * - Index in Elasticsearch
   * - Update aggregate views
   */
  private async onContentCreated(event: ContentCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing ContentCreatedEvent: ${event.aggregateId} - ${event.data.title}`
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `New content created: ${JSON.stringify({
        id: event.aggregateId,
        tenantId: event.data.tenantId,
        authorId: event.data.authorId,
        title: event.data.title,
        type: event.data.type,
        status: event.data.status,
        correlationId: event.metadata?.correlationId,
      })}`
    );

    // Example: Index in Elasticsearch (pseudo-code)
    // await this.searchClient.index({
    //   index: 'contents',
    //   id: event.aggregateId,
    //   body: event.data,
    // });

    // Example: Update tenant content count (pseudo-code)
    // await this.updateTenantStats(event.data.tenantId, 'increment');
  }

  /**
   * Handle ContentUpdatedEvent
   *
   * Story 3.2: Update Content
   *
   * When content is updated:
   * - Update cache with new data
   * - Re-index in Elasticsearch
   * - Invalidate related queries
   */
  private async onContentUpdated(event: ContentUpdatedEvent): Promise<void> {
    this.logger.log(
      `Processing ContentUpdatedEvent: ${event.aggregateId} - ${event.data.title}`
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `Content updated: ${JSON.stringify({
        id: event.aggregateId,
        tenantId: event.data.tenantId,
        changedBy: event.data.changedBy,
        changedFields: event.data.changedFields,
        title: event.data.title,
        previousStatus: event.data.previousStatus,
        newStatus: event.data.newStatus,
        correlationId: event.metadata?.correlationId,
      })}`
    );

    // Example: Update cache (pseudo-code)
    // await this.cacheService.invalidate(`content:${event.aggregateId}`);
    // await this.cacheService.invalidate(`tenant:${event.data.tenantId}:contents`);

    // Example: Re-index in Elasticsearch (pseudo-code)
    // await this.searchClient.update({
    //   index: 'contents',
    //   id: event.aggregateId,
    //   body: {
    //     doc: {
    //       title: event.data.title,
    //       content: event.data.content,
    //       excerpt: event.data.excerpt,
    //       status: event.data.newStatus || event.data.afterState?.status,
    //       updatedAt: event.data.changedAt,
    //     },
    //   },
    // });

    // Example: Invalidate query cache if status changed
    // if (event.data.changedFields.includes('status')) {
    //   await this.queryCache.invalidate(`tenant:${event.data.tenantId}:contents:by-status`);
    // }
  }
}
