import { Injectable } from '@nestjs/common';
import type { IFileRulesChecker } from '../../domain/services';

/**
 * File Rules Checker Service
 *
 * Infrastructure implementation of IFileRulesChecker interface.
 *
 * Responsibilities:
 * - Check for duplicate file names in tenant
 * - Determine file type from MIME type
 *
 * Story 5.2: Validate File Upload
 */
@Injectable()
export class FileRulesCheckerService implements IFileRulesChecker {
  /**
   * Check if file name already exists in tenant
   *
   * @param tenantId Tenant ID
   * @param fileName File name to check
   * @param excludeFileId File ID to exclude from check (for updates)
   * @returns true if duplicate exists, false otherwise
   *
   * Note: This is a simplified implementation. In a real application,
   * you would query the database to check for duplicates.
   */
  async checkDuplicateFileName(
    tenantId: string,
    fileName: string,
    excludeFileId?: string,
  ): Promise<boolean> {
    // TODO: Implement actual database check
    // For now, return false to allow all file names
    // In production, query FileRepository or FileReadDao to check existence

    // Example implementation:
    // const existingFile = await this.fileReadDao.findByFileName(tenantId, fileName);
    // if (!existingFile) return false;
    // if (excludeFileId && existingFile.id === excludeFileId) return false;
    // return true;

    return false;
  }

  /**
   * Get file type from MIME type
   *
   * @param mimeType MIME type
   * @returns File type (IMAGE, DOCUMENT, VIDEO, AUDIO, OTHER)
   */
  getFileTypeFromMimeType(mimeType: string): string {
    const mimeTypeLower = mimeType.toLowerCase();

    // Image types
    if (
      mimeTypeLower.startsWith('image/') ||
      mimeTypeLower.includes('jpg') ||
      mimeTypeLower.includes('jpeg') ||
      mimeTypeLower.includes('png') ||
      mimeTypeLower.includes('gif') ||
      mimeTypeLower.includes('webp') ||
      mimeTypeLower.includes('bmp') ||
      mimeTypeLower.includes('svg')
    ) {
      return 'IMAGE';
    }

    // Document types
    if (
      mimeTypeLower.includes('pdf') ||
      mimeTypeLower.includes('msword') ||
      mimeTypeLower.includes('wordprocessingml') ||
      mimeTypeLower.includes('ms-excel') ||
      mimeTypeLower.includes('spreadsheetml') ||
      mimeTypeLower.includes('ms-powerpoint') ||
      mimeTypeLower.includes('presentationml') ||
      mimeTypeLower.includes('text/') ||
      mimeTypeLower.includes('opendocument') ||
      mimeTypeLower.includes('rtf') ||
      mimeTypeLower.includes('csv')
    ) {
      return 'DOCUMENT';
    }

    // Video types
    if (
      mimeTypeLower.startsWith('video/') ||
      mimeTypeLower.includes('mp4') ||
      mimeTypeLower.includes('avi') ||
      mimeTypeLower.includes('mov') ||
      mimeTypeLower.includes('wmv') ||
      mimeTypeLower.includes('flv') ||
      mimeTypeLower.includes('webm') ||
      mimeTypeLower.includes('mkv')
    ) {
      return 'VIDEO';
    }

    // Audio types
    if (
      mimeTypeLower.startsWith('audio/') ||
      mimeTypeLower.includes('mp3') ||
      mimeTypeLower.includes('wav') ||
      mimeTypeLower.includes('ogg') ||
      mimeTypeLower.includes('flac') ||
      mimeTypeLower.includes('aac') ||
      mimeTypeLower.includes('m4a')
    ) {
      return 'AUDIO';
    }

    // Archive types
    if (
      mimeTypeLower.includes('zip') ||
      mimeTypeLower.includes('rar') ||
      mimeTypeLower.includes('tar') ||
      mimeTypeLower.includes('7z') ||
      mimeTypeLower.includes('gzip') ||
      mimeTypeLower.includes('archive')
    ) {
      return 'ARCHIVE';
    }

    // Default to OTHER for unrecognized types
    return 'OTHER';
  }
}
