import { DomainException } from '@core/common';
import {
  FILE_VALIDATION_ERROR_CODES,
  FILE_VALIDATION_ERROR_MESSAGES,
} from '../../constants/error-codes';

/**
 * File Extension Mismatch Exception
 *
 * Thrown when file extension doesn't match the actual file type (MIME type)
 */
export class FileExtensionMismatchException extends DomainException {
  constructor(fileName: string, extension: string, mimeType: string) {
    super(
      `${FILE_VALIDATION_ERROR_MESSAGES.EXTENSION_MISMATCH}: ${fileName} (extension: ${extension}, actual type: ${mimeType})`,
      FILE_VALIDATION_ERROR_CODES.EXTENSION_MISMATCH,
      {
        fileName,
        extension,
        mimeType,
      },
    );
    Object.setPrototypeOf(this, FileExtensionMismatchException.prototype);
  }
}
