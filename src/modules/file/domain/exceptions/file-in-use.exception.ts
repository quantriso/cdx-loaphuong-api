import { DomainException } from '@core/domain';

/**
 * Exception thrown when attempting to delete a file that is still in use by other entities
 */
export class FileInUseException extends DomainException {
  constructor(fileId: string, usageContext: string) {
    super(
      `File with ID ${fileId} is currently in use by ${usageContext} and cannot be deleted`,
      'FILE_IN_USE',
    );
  }
}
