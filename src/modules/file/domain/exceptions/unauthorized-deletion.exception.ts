import { DomainException } from '@core/domain';

/**
 * Exception thrown when attempting to delete a file without proper authorization
 */
export class UnauthorizedDeletionException extends DomainException {
  constructor(fileId: string, reason: string) {
    super(
      `Unauthorized deletion attempt for file with ID ${fileId}: ${reason}`,
      'UNAUTHORIZED_DELETION',
    );
  }
}
