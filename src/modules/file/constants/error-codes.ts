/**
 * File Validation Error Codes
 *
 * Error codes for file validation failures
 * Used for frontend error handling and internationalization
 */
export const FILE_VALIDATION_ERROR_CODES = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  EXTENSION_MISMATCH: 'EXTENSION_MISMATCH',
  MALICIOUS_FILE: 'MALICIOUS_FILE',
  INVALID_FILE_NAME: 'INVALID_FILE_NAME',
  EMPTY_FILE: 'EMPTY_FILE',
  MIME_TYPE_INVALID: 'MIME_TYPE_INVALID',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
} as const;

export type FileValidationErrorCode =
  (typeof FILE_VALIDATION_ERROR_CODES)[keyof typeof FILE_VALIDATION_ERROR_CODES];

/**
 * Error messages in Vietnamese for user-friendly display
 */
export const FILE_VALIDATION_ERROR_MESSAGES: Record<
  FileValidationErrorCode,
  string
> = {
  INVALID_FILE_TYPE: 'Loại file không được phép',
  FILE_SIZE_EXCEEDED: 'Kích thước file vượt quá giới hạn cho phép',
  EXTENSION_MISMATCH: 'Định dạng file không khớp với nội dung',
  MALICIOUS_FILE: 'File chứa nội dung nguy hiểm',
  INVALID_FILE_NAME: 'Tên file không hợp lệ',
  EMPTY_FILE: 'File trống',
  MIME_TYPE_INVALID: 'Loại MIME không hợp lệ',
  FILE_CORRUPTED: 'File bị lỗi',
};
