import { DomainException } from '@core/common';
import {
  FILE_VALIDATION_ERROR_CODES,
  FILE_VALIDATION_ERROR_MESSAGES,
} from '../../constants/error-codes';

/**
 * Malicious File Exception
 *
 * Thrown when a file contains malicious signatures or patterns
 */
export class MaliciousFileException extends DomainException {
  constructor(fileName: string, detectedPattern?: string) {
    super(
      detectedPattern
        ? `${FILE_VALIDATION_ERROR_MESSAGES.MALICIOUS_FILE}: ${fileName} (phát hiện: ${detectedPattern})`
        : `${FILE_VALIDATION_ERROR_MESSAGES.MALICIOUS_FILE}: ${fileName}`,
      FILE_VALIDATION_ERROR_CODES.MALICIOUS_FILE,
      {
        fileName,
        detectedPattern,
      },
    );
    Object.setPrototypeOf(this, MaliciousFileException.prototype);
  }
}
