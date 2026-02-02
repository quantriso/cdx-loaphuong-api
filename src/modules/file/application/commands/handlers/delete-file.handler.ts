import {
  Injectable,
  Inject,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { DeleteFileCommand } from '../delete-file.command';
import type { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import { FileTokens } from '../../../constants';
import { File, FileId } from '../../../domain';
import type { IFileReadDaoPort } from '../../../application/queries/ports/file-read-dao.interface';

/**
 * Delete File Command Handler
 *
 * Story 5.5: Delete File
 *
 * Business Rules:
 * - File must exist and belong to the tenant
 * - File is deleted from storage service
 * - File metadata is soft deleted from database
 * - FileDeletedEvent is emitted
 * - Cannot delete files that are in use (optional validation)
 *
 * Implementation:
 * 1. Validate file exists and belongs to tenant
 * 2. Check if file is in use (optional)
 * 3. Soft delete file from repository (emits FileDeletedEvent)
 * 4. Delete physical file from storage (can be done asynchronously)
 */
@CommandHandler(DeleteFileCommand)
@Injectable()
export class DeleteFileHandler implements ICommandHandler<
  DeleteFileCommand,
  void
> {
  constructor(
    @Inject(FileTokens.FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    @Optional()
    @Inject(FileTokens.FILE_READ_DAO)
    private readonly fileReadDao?: IFileReadDaoPort,
  ) {}

  async execute(command: DeleteFileCommand): Promise<void> {
    // 1. Retrieve file
    const fileId = new FileId(command.fileId);
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.tenantId !== command.tenantId) {
      throw new NotFoundException('File not found');
    }

    // Check if file is already deleted
    if (file.isDeleted()) {
      // File is already deleted, throw 404
      throw new NotFoundException('File not found');
    }

    // 2. Soft delete the file (emits FileDeletedEvent)
    file.softDelete();
    await this.fileRepository.save(file);

    // 3. Invalidate cache for the deleted file
    if (this.fileReadDao) {
      await this.fileReadDao.invalidateCache(command.fileId, command.tenantId);
    }

    // 4. In a real implementation, you would delete the physical files
    // from storage here. This could be done synchronously or via
    // a background job/event listener.
    // await this.fileStorage.deleteFile(file.storagePath);
    // if (file.processedPath) {
    //   await this.fileStorage.deleteFile(file.processedPath);
    // }
    // if (file.thumbnailPath) {
    //   await this.fileStorage.deleteFile(file.thumbnailPath);
    // }
  }
}
