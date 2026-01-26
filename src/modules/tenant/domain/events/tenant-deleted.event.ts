import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Tenant Deleted Event Data (Type-safe payload)
 */
export interface TenantDeletedEventData {
  id: string;
  subdomain: string;
}

/**
 * Tenant Deleted Domain Event
 *
 * Published when a tenant is soft-deleted.
 * Uses BaseDomainEvent for automatic immutability and type-safety.
 *
 * Event Consumers (Projections) can use this to:
 * - Update Read Model database
 * - Archive tenant data
 * - Cleanup tenant-specific resources
 * - Send deletion notifications
 */
export class TenantDeletedEvent extends BaseDomainEvent<TenantDeletedEventData> {
  constructor(
    aggregateId: string,
    data: TenantDeletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tenant', 'TenantDeleted', data, metadata);
  }
}
