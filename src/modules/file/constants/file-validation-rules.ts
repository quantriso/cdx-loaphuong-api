/**
 * File Validation Rules
 *
 * Defines allowed file types, size limits, and security rules
 */

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
] as const;

/**
 * Allowed MIME types for documents
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/html',
  'application/x-httpd-php',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const;

/**
 * Allowed MIME types for videos
 */
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
] as const;

/**
 * Allowed MIME types for audio
 */
export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
] as const;

/**
 * All file validation rules consolidated
 */
export const FILE_VALIDATION_RULES = {
  ALLOWED_MIME_TYPES: [
    ...ALLOWED_IMAGE_MIME_TYPES,
    ...ALLOWED_DOCUMENT_MIME_TYPES,
    ...ALLOWED_VIDEO_MIME_TYPES,
    ...ALLOWED_AUDIO_MIME_TYPES,
  ],
  MALICIOUS_SIGNATURES: {
    // Executable signatures
    MZ: 'Windows executable',
    '\x7fELF': 'Linux executable',
    '\xca\xfe\xba\xbe': 'Mach-O binary (macOS)',
    // Script signatures
    '#!/': 'Shell script',
    '#!/bin/': 'Shell script',
    '#!/usr/bin/': 'Shell script',
    '<%': 'ASP/JSP',
    '<?php': 'PHP',
    '<?': 'PHP',
    '<script': 'JavaScript/XSS',
  },
  EXTENSION_TO_MIME_TYPE: {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    html: 'text/html',
    php: 'application/x-httpd-php',
    // Videos
    mp4: 'video/mp4',
    mpeg: 'video/mpeg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/m4a',
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  },
  MIME_TYPE_TO_EXTENSION: {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/bmp': ['bmp'],
    'image/svg+xml': ['svg'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      'docx',
    ],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
      'xlsx',
    ],
    'application/vnd.ms-powerpoint': ['ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      ['pptx'],
    'text/plain': ['txt'],
    'text/html': ['html'],
    'application/x-httpd-php': ['php'],
    'video/mp4': ['mp4'],
    'video/mpeg': ['mpeg'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
    'video/x-ms-wmv': ['wmv'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/ogg': ['ogg'],
    'audio/m4a': ['m4a'],
    'audio/mp3': ['mp3'],
    'application/zip': ['zip'],
    'application/x-rar-compressed': ['rar'],
    'application/x-7z-compressed': ['7z'],
  },
};

/**
 * All allowed MIME types
 */
export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Disallowed file extensions (security risk)
 */
export const DISALLOWED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.js',
  '.jar',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.pkg',
  '.msi',
  '.sh',
  '.ps1',
  '.vb',
  '.vbe',
  '.wsf',
  '.wsc',
] as const;

/**
 * Maximum file name length
 */
export const MAX_FILE_NAME_LENGTH = 255;

/**
 * Malicious file patterns (magic numbers and signatures)
 */
export const MALICIOUS_SIGNATURES = [
  // Executable signatures
  'MZ', // Windows executable
  '\x7fELF', // Linux executable
  '\xca\xfe\xba\xbe', // Mach-O binary (macOS)
  // Script signatures
  '#!/', // Shell script
  '#!/bin/', // Shell script
  '#!/usr/bin/', // Shell script
  '<%', // ASP/JSP
  '<?php', // PHP
  '<?', // PHP
  '<script', // JavaScript/XSS
] as const;

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.php': 'application/x-httpd-php',

  // Videos
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/m4a',

  // Archives
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
};

/**
 * Magic numbers for file type detection
 */
export const MAGIC_NUMBERS: Record<string, string[]> = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e470d0a1a0a'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'],
  'image/bmp': ['424d'],
  'application/pdf': ['25504446'],
  'video/mp4': ['66747970'],
  'video/quicktime': ['6d6f6f76'],
  'application/zip': ['504b0304'],
};

/**
 * File type categories
 */
export enum FILE_TYPE {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER',
}

/**
 * Get file size limit for MIME type
 */
export function getFileSizeLimit(mimeType: string): number {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any)) {
    return FILE_SIZE_LIMITS.IMAGE;
  }
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as any)) {
    return FILE_SIZE_LIMITS.DOCUMENT;
  }
  if (ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as any)) {
    return FILE_SIZE_LIMITS.VIDEO;
  }
  return FILE_SIZE_LIMITS.DEFAULT;
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Check if extension is disallowed (security risk)
 */
export function isDisallowedExtension(extension: string): boolean {
  return DISALLOWED_EXTENSIONS.includes(extension.toLowerCase() as any);
}

/**
 * Image processing configuration
 * Story 5.3: Process Uploaded Images
 */
export const IMAGE_PROCESSING_CONFIG = {
  DEFAULT_WIDTH: 2000, // Max width 2000px (maintaining aspect ratio)
  DEFAULT_HEIGHT: 2000, // Max height 2000px
  THUMBNAIL_WIDTH: 300, // Thumbnail at 300x300px
  THUMBNAIL_HEIGHT: 300,
  DEFAULT_QUALITY: 80, // Compress to 80% quality
  THUMBNAIL_QUALITY: 75, // Thumbnail quality 75%
  DEFAULT_FORMAT: 'webp' as const, // Convert to WebP format
  PROCESSING_TIMEOUT: 10000, // Timeout after 10 seconds
  MAX_RETRIES: 1, // Retry once on failure
  RETRY_DELAY_MS: 1000,
  MAX_PROCESSED_SIZE: 10 * 1024 * 1024, // 10MB maximum processed file size
  PERFORMANCE_ALERT_THRESHOLD: 5000, // Alert if processing exceeds 5 seconds
} as const;

/**
 * Get expected MIME type from file extension
 */
export function getMimeTypeFromExtension(fileName: string): string | null {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return EXTENSION_TO_MIME_TYPE[ext] || null;
}
