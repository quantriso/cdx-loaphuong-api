import { BaseDomainEvent, IEventMetadata } from '@core/domain';
import { FileTypeEnum } from '../value-objects/file-type.value-object';

export interface FileUploadedData {
  tenantId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileType: FileTypeEnum;
  storagePath: string;
  uploadedBy: string;
}

export class FileUploadedEvent extends BaseDomainEvent<FileUploadedData> {
  constructor(
    aggregateId: string,
    data: FileUploadedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'File', 'FileUploaded', data, metadata);
  }
}
