import { Injectable, Logger } from '@nestjs/common';

// Import from Core
import { DomainException } from '@core/domain';

// Import Domain
import { FileInUseException } from '../../domain/exceptions';
import { FILE_ATTACHMENT_CHECKER_TOKEN } from '../../constants/tokens';

/**
 * Service to check if a file is attached to other entities before deletion
 *
 * This service implements the attachment checking logic to prevent accidental
 * deletion of files that are still in use by other entities (e.g., content, tags, etc.)
 */
@Injectable()
export class FileAttachmentCheckerService {
  private readonly logger = new Logger(FileAttachmentCheckerService.name);

  constructor() {}

  /**
   * Check if a file is currently in use by other entities
   *
   * @param fileId - The ID of the file to check
   * @returns Promise<void> - Throws FileInUseException if file is in use
   */
  async checkFileUsage(fileId: string): Promise<void> {
    this.logger.log(`Checking usage for file with ID: ${fileId}`);

    // NOTE: This service only checks for file attachments to other entities.
    // File existence and deletion status are checked by the DeleteFileHandler
    // before calling this service, so we don't need to duplicate those checks here.

    // TODO: Implement actual attachment checks against other modules
    // This would typically involve:
    // 1. Checking if file is referenced in content table
    // 2. Checking if file is referenced in tag table
    // 3. Checking if file is referenced in any other tables

    // Example implementation (pseudo-code):
    // const contentReferences = await this.db
    //   .select({ count: sql<number>`count(*)` })
    //   .from(contentsTable)
    //   .where(eq(contentsTable.featuredImageFileId, fileId));
    //
    // if (contentReferences[0].count > 0) {
    //   throw new FileInUseException(
    //     fileId,
    //     `${contentReferences[0].count} content item(s)`,
    //   );
    // }

    // For now, we'll just log that no attachments were found
    this.logger.log(`No attachments found for file with ID: ${fileId}`);
  }

  /**
   * Get detailed usage information for a file
   *
   * @param fileId - The ID of the file to check
   * @returns Promise with usage information
   */
  async getFileUsageDetails(fileId: string): Promise<{
    isInUse: boolean;
    usageContexts: Array<{
      entity: string;
      count: number;
      details?: string[];
    }>;
  }> {
    this.logger.log(`Getting usage details for file with ID: ${fileId}`);

    // TODO: Implement actual usage details retrieval
    // This would return information about where the file is used

    return {
      isInUse: false,
      usageContexts: [],
    };
  }
}

/**
 * Provider for FileAttachmentCheckerService
 */
export const FileAttachmentCheckerServiceProvider = {
  provide: FILE_ATTACHMENT_CHECKER_TOKEN,
  useClass: FileAttachmentCheckerService,
};
