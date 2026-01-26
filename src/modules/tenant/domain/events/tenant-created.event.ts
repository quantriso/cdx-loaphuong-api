import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Tenant Created Event Data (Type-safe payload)
 */
export interface TenantCreatedEventData {
  id: string;
  name: string;
  subdomain: string;
  adminEmail: string;
}

/**
 * Tenant Created Domain Event
 *
 * Published when a new tenant is created.
 * Uses BaseDomainEvent for automatic immutability and type-safety.
 *
 * Event Consumers (Projections) can use this to:
 * - Update Read Model database
 * - Send welcome emails
 * - Initialize tenant-specific resources
 * - Sync with external systems
 */
export class TenantCreatedEvent extends BaseDomainEvent<TenantCreatedEventData> {
  constructor(
    aggregateId: string,
    data: TenantCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tenant', 'TenantCreated', data, metadata);
  }
}
