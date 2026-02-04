import { ICommand } from '@core/application';

/**
 * Command to force delete a file regardless of attachments
 *
 * This command should be used with caution as it will delete a file
 * even if it's still attached to other entities (e.g., content, tags).
 * This is typically used by administrators or in cleanup scenarios.
 */
export class ForceDeleteFileCommand implements ICommand {
  readonly fileId: string;
  readonly deletedBy: string;
  readonly reason?: string;

  /**
   * Create a new ForceDeleteFileCommand
   *
   * @param fileId - The ID of the file to delete
   * @param deletedBy - The ID of the user requesting the deletion
   * @param reason - Optional reason for the deletion
   */
  constructor(fileId: string, deletedBy: string, reason?: string) {
    if (!fileId || fileId.trim().length === 0) {
      throw new Error('File ID is required');
    }
    if (!deletedBy || deletedBy.trim().length === 0) {
      throw new Error('Deleted by is required');
    }
    this.fileId = fileId;
    this.deletedBy = deletedBy;
    this.reason = reason;
  }
}
