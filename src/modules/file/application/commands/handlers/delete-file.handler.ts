import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { DeleteFileCommand } from '../delete-file.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import { FileTokens } from '../../../constants';
import { File, FileId } from '../../../domain';
import { FileInUseException } from '../../../domain/exceptions';
import { FILE_ATTACHMENT_CHECKER_TOKEN } from '../../../constants/tokens';
import type { FileAttachmentCheckerService } from '../../../infrastructure/services/file-attachment-checker.service';
import type { IFileReadDaoPort } from '../../../application/queries/ports';

/**
 * Delete File Command Handler
 *
 * Story 5.5: Delete File
 *
 * Business Rules:
 * - File must exist and belong to the tenant
 * - Cannot delete files that are in use
 * - Soft delete file (emits FileDeletedEvent)
 *
 * Simplified Implementation:
 * 1. Validate file exists and belongs to tenant
 * 2. Check if file is in use (via attachment checker)
 * 3. Call domain delete() method (emits FileDeletedEvent)
 * 4. Save aggregate (repository handles persistence)
 */
@CommandHandler(DeleteFileCommand)
@Injectable()
export class DeleteFileHandler implements ICommandHandler<
  DeleteFileCommand,
  void
> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Inject(FILE_ATTACHMENT_CHECKER_TOKEN)
    private readonly fileAttachmentChecker: FileAttachmentCheckerService,
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao: IFileReadDaoPort,
  ) {}

  async execute(command: DeleteFileCommand): Promise<void> {
    this.logger.log(
      `Deleting file ${command.fileId} for tenant ${command.tenantId}`,
    );

    // 1. Retrieve file
    const fileId = new FileId(command.fileId);
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      this.logger.warn(`File ${command.fileId} not found`);
      throw new NotFoundException('File not found');
    }

    if (file.tenantId !== command.tenantId) {
      this.logger.warn(
        `File ${command.fileId} does not belong to tenant ${command.tenantId}`,
      );
      throw new NotFoundException('File not found');
    }

    // 2. Check if file is in use
    try {
      await this.fileAttachmentChecker.checkFileUsage(command.fileId);
    } catch (error) {
      if (error instanceof FileInUseException) {
        this.logger.warn(
          `Attempted to delete file ${command.fileId} that is still in use`,
        );
        throw error;
      }
      this.logger.error(`Error checking file usage: ${error.message}`);
      throw error;
    }

    // 3. Delete file (domain method emits FileDeletedEvent)
    file.delete(command.deletedBy);

    // 4. Save aggregate (repository persists and publishes events)
    await this.fileRepository.save(file);

    // 5. Invalidate cache
    try {
      await this.fileReadDao.invalidateCache(command.fileId, command.tenantId);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache for file ${command.fileId}: ${error.message}`,
      );
    }

    this.logger.log(`Successfully deleted file ${command.fileId}`);
  }
}
