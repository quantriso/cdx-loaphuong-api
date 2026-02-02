import { DomainException } from '@core/common';
import {
  FILE_VALIDATION_ERROR_CODES,
  FILE_VALIDATION_ERROR_MESSAGES,
} from '../../constants/error-codes';

/**
 * File Size Exceeded Exception
 *
 * Thrown when an uploaded file exceeds the maximum allowed size
 */
export class FileSizeExceededException extends DomainException {
  constructor(actualSize: number, maxSize: number, fileType: string) {
    const actualSizeMB = (actualSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const message = `${FILE_VALIDATION_ERROR_MESSAGES.FILE_SIZE_EXCEEDED}: ${actualSizeMB}MB (tối đa: ${maxSizeMB} cho ${fileType})`;

    super(message, FILE_VALIDATION_ERROR_CODES.FILE_SIZE_EXCEEDED, {
      actualSize,
      maxSize,
      fileType,
      actualSizeMB,
      maxSizeMB,
    });
    Object.setPrototypeOf(this, FileSizeExceededException.prototype);
  }
}
