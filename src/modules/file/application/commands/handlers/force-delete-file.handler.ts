import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { FileId } from '../../../domain/value-objects/file-id.value-object';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import { ForceDeleteFileCommand } from '../../commands/force-delete-file.command';
import { FileTokens } from '../../../constants';
import type { IFileReadDaoPort } from '../../../application/queries/ports';

/**
 * Handler for ForceDeleteFileCommand
 *
 * This handler deletes a file regardless of whether it's attached to other entities.
 * This should be used with caution and is typically reserved for administrative operations
 * or cleanup scenarios.
 *
 * ## Security Considerations
 *
 * - This handler should only be accessible to authorized users (e.g., admins)
 * - Consider implementing additional authorization checks
 * - Log all force delete operations for audit purposes
 *
 * ## Event Publishing
 *
 * - FileDeletedEvent will be published automatically via BaseAggregateRepository
 * - This event can be used to:
 *   - Update read models
 *   - Notify other services
 *   - Clean up related resources
 */
@CommandHandler(ForceDeleteFileCommand)
@Injectable()
export class ForceDeleteFileHandler implements ICommandHandler<
  ForceDeleteFileCommand,
  void
> {
  private readonly logger = new Logger(ForceDeleteFileHandler.name);

  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao: IFileReadDaoPort,
  ) {}

  async execute(command: ForceDeleteFileCommand): Promise<void> {
    this.logger.log(
      `Force deleting file ${command.fileId} by user ${command.deletedBy}`,
    );

    if (command.reason) {
      this.logger.log(`Deletion reason: ${command.reason}`);
    }

    // Load file aggregate
    const fileId = new FileId(command.fileId);
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      this.logger.warn(`File ${command.fileId} not found`);
      throw new NotFoundException('File not found');
    }

    // Check if already deleted
    if (file.isDeleted) {
      this.logger.warn(`File ${command.fileId} is already deleted`);
      throw new NotFoundException('File not found');
    }

    // Log force delete operation
    this.logger.warn(`Force deleting file ${command.fileId}`);

    // Force delete file aggregate (emits FileDeletedEvent with isForceDelete: true)
    file.forceDelete(command.deletedBy, command.reason);

    // Save aggregate (this will automatically publish FileDeletedEvent)
    await this.fileRepository.save(file);

    // Invalidate cache
    try {
      await this.fileReadDao.invalidateCache(command.fileId, file.tenantId);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate cache for file ${command.fileId}: ${error.message}`,
      );
    }

    this.logger.log(`Successfully force deleted file ${command.fileId}`);
  }
}
