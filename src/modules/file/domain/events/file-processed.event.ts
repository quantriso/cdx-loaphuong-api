import { BaseDomainEvent, IEventMetadata } from '@core/domain';

export interface FileProcessedData {
  originalPath: string;
  processedPath: string;
  thumbnailPath?: string;
  metadata?: Record<string, any>;
}

export class FileProcessedEvent extends BaseDomainEvent<FileProcessedData> {
  constructor(
    aggregateId: string,
    data: FileProcessedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'File', 'FileProcessed', data, metadata);
  }
}
