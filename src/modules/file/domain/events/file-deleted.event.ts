import { BaseDomainEvent, IEventMetadata } from '@core/domain';

export interface FileDeletedData {
  tenantId: string;
  originalFileName: string;
  storagePath: string;
}

export class FileDeletedEvent extends BaseDomainEvent<FileDeletedData> {
  constructor(
    aggregateId: string,
    data: FileDeletedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'File', 'FileDeleted', data, metadata);
  }
}
