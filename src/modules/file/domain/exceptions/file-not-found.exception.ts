import { DomainException } from '@core/common';
import {
  FILE_VALIDATION_ERROR_CODES,
  FILE_VALIDATION_ERROR_MESSAGES,
} from '../../constants/error-codes';

/**
 * File Not Found Exception
 *
 * Thrown when a requested file does not exist in the database
 * or has been deleted (soft delete).
 */
export class FileNotFoundException extends DomainException {
  constructor(fileId: string) {
    super(
      `${FILE_VALIDATION_ERROR_MESSAGES.FILE_NOT_FOUND}: ${fileId}`,
      FILE_VALIDATION_ERROR_CODES.FILE_NOT_FOUND,
      {
        fileId,
      },
    );
    Object.setPrototypeOf(this, FileNotFoundException.prototype);
  }
}
