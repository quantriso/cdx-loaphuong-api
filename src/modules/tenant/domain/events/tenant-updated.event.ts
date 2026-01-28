import { BaseDomainEvent, IEventMetadata } from '@core/domain';

/**
 * Tenant Updated Event Data
 */
export interface TenantUpdatedEventData {
  id: string;
  name?: string;
  brandingConfig?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
  } | null;
  limits?: {
    maxUsers?: number;
    maxContent?: number;
    maxStorage?: number;
  } | null;
}

/**
 * Tenant Updated Domain Event
 *
 * Published when tenant configuration is updated.
 */
export class TenantUpdatedEvent extends BaseDomainEvent<TenantUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: TenantUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Tenant', 'TenantUpdated', data, metadata);
  }
}
