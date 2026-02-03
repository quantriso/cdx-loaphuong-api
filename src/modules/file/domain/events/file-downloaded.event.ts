import { BaseDomainEvent, IEventMetadata } from '@core/domain';
import { FileTypeEnum } from '../value-objects/file-type.value-object';

export interface FileDownloadedData {
  tenantId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileType: FileTypeEnum;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  contentId?: string;
}

export class FileDownloadedEvent extends BaseDomainEvent<FileDownloadedData> {
  constructor(
    aggregateId: string,
    data: FileDownloadedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'File', 'FileDownloaded', data, metadata);
  }
}
