export { File } from './entities/file.entity';
export type { FileProps } from './entities/file.entity';

export { FileId } from './value-objects/file-id.value-object';
export { FileType, FileTypeEnum } from './value-objects/file-type.value-object';

export { FileUploadedEvent } from './events/file-uploaded.event';
export { FileProcessedEvent } from './events/file-processed.event';
export { FileDeletedEvent } from './events/file-deleted.event';

export type { IFileRepository } from './repositories/file.repository.interface';
