import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  BaseProjection,
  IEventHandler,
  IProjectionLogger,
} from '@core/application';
import {
  DATABASE_WRITE_TOKEN,
  EventsHandler,
  type DrizzleDB,
} from '@shared';
import { TENANT_READ_DAO_TOKEN } from '../../constants/tokens';
import { TenantCreatedEvent, TenantDeletedEvent } from '../../domain/events';
import { tenantsTable } from '../persistence/drizzle/schema';
import { TenantReadDao } from '../persistence/read/tenant-read-dao';
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
 * Tenant Read Model Projection
 *
 * Projection là component quan trọng trong CQRS để đồng bộ Read Model
 * khi có Domain Events phát sinh từ Write Side.
 *
 * Trong ví dụ này, chúng ta demo việc:
 * 1. Lắng nghe TenantCreatedEvent, TenantDeletedEvent
 * 2. Update/sync dữ liệu (có thể là cache, search index, denormalized table)
 * 3. Đảm bảo idempotency (không xử lý duplicate events)
 *
 * ## Use Cases cho Projection:
 * - Update Redis cache khi tenant thay đổi
 * - Sync với Elasticsearch cho full-text search
 * - Update denormalized view table cho complex queries
 * - Send notifications/webhooks
 *
 * ## Idempotency:
 * - Track eventId đã xử lý
 * - Check version trước khi update
 *
 * @example
 * // Khi tenant được tạo:
 * // 1. Tenant.create() → TenantCreatedEvent
 * // 2. Repository.save() → Publish event
 * // 3. EventBus → Dispatch to Projection
 * // 4. Projection.handle() → Update cache/search/etc.
 */
@Injectable()
@EventsHandler(TenantCreatedEvent, TenantDeletedEvent)
export class TenantReadModelProjection
  extends BaseProjection<TenantCreatedEvent | TenantDeletedEvent>
  implements IEventHandler<TenantCreatedEvent | TenantDeletedEvent>
{
  // In-memory event tracking for demo (production should use Redis/DB)
  private processedEvents: Set<string> = new Set();

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(TENANT_READ_DAO_TOKEN)
    private readonly tenantReadDao: TenantReadDao,
  ) {
    super(new NestProjectionLogger('TenantReadModelProjection'));
  }

  /**
   * Main handle method (required by BaseProjection abstract class)
   * This is the actual projection logic that processes events
   */
  async handle(event: TenantCreatedEvent | TenantDeletedEvent): Promise<void> {
    switch (event.eventType) {
      case 'TenantCreated':
        await this.onTenantCreated(event as TenantCreatedEvent);
        break;

      case 'TenantDeleted':
        await this.onTenantDeleted(event as TenantDeletedEvent);
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Override để implement idempotency check
   * Production: Dùng Redis SETNX hoặc DB table
   */
  protected async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  /**
   * Override để mark event as processed
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
   * Handle TenantCreatedEvent
   *
   * Khi tenant được tạo mới, có thể:
   * - Add vào cache
   * - Index vào Elasticsearch
   * - Update aggregate views
   */
  private async onTenantCreated(event: TenantCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing TenantCreatedEvent: ${event.aggregateId} - ${event.data.name}`,
    );

    // Demo: Log the event (production would update cache/search index)
    this.logger.debug(
      `New tenant created: ${JSON.stringify({
        id: event.aggregateId,
        name: event.data.name,
        subdomain: event.data.subdomain,
        adminEmail: event.data.adminEmail,
        correlationId: event.metadata?.correlationId,
      })}`,
    );

    // Example: Index in Elasticsearch (pseudo-code)
    // await this.searchClient.index({
    //   index: 'tenants',
    //   id: event.aggregateId,
    //   body: event.data,
    // });
  }

  /**
   * Handle TenantDeletedEvent
   *
   * Khi tenant bị xóa:
   * - Remove khỏi cache
   * - Remove khỏi search index
   * - Update aggregate counts
   */
  private async onTenantDeleted(event: TenantDeletedEvent): Promise<void> {
    this.logger.log(`Processing TenantDeletedEvent: ${event.aggregateId}`);

    // Demo: Fetch tenant info before deletion for logging
    const tenant = await this.db
      .select({ name: tenantsTable.name, subdomain: tenantsTable.tenantId })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, event.aggregateId))
      .limit(1);

    if (tenant.length > 0) {
      this.logger.debug(
        `Tenant deleted: ${JSON.stringify({
          id: event.aggregateId,
          name: tenant[0].name,
          subdomain: tenant[0].subdomain,
          correlationId: event.metadata?.correlationId,
        })}`,
      );
    }

    // Remove from cache
    await this.tenantReadDao.invalidateCache(event.aggregateId);

    // Example: Remove from search index (pseudo-code)
    // await this.searchClient.delete({
    //   index: 'tenants',
    //   id: event.aggregateId,
    // });
  }
}
