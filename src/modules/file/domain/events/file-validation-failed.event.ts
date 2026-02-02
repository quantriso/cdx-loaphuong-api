import { BaseDomainEvent, IEventMetadata } from '@core/domain';
import { FileId } from '../value-objects/file-id.value-object';

export interface FileValidationFailedData {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  failureReason: string;
  errorCode: string;
}

/**
 * File Validation Failed Event
 *
 * Domain event raised when file validation fails during upload
 */
export class FileValidationFailedEvent extends BaseDomainEvent<FileValidationFailedData> {
  constructor(
    aggregateId: string,
    data: FileValidationFailedData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'File', 'FileValidationFailed', data, metadata);
  }
}
