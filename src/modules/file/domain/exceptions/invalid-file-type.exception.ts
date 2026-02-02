import { DomainException } from '@core/common';
import {
  FILE_VALIDATION_ERROR_CODES,
  FILE_VALIDATION_ERROR_MESSAGES,
} from '../../constants/error-codes';

/**
 * Invalid File Type Exception
 *
 * Thrown when an uploaded file has a type that is not allowed
 */
export class InvalidFileTypeException extends DomainException {
  constructor(fileName: string, mimeType: string) {
    super(
      `${FILE_VALIDATION_ERROR_MESSAGES.INVALID_FILE_TYPE}: ${fileName} (type: ${mimeType})`,
      FILE_VALIDATION_ERROR_CODES.INVALID_FILE_TYPE,
      { fileName, mimeType },
    );
    Object.setPrototypeOf(this, InvalidFileTypeException.prototype);
  }
}
