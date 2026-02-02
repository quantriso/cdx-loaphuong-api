import { UploadFileHandler } from './upload-file.handler';
import { ProcessFileHandler } from './process-file.handler';
import { DeleteFileHandler } from './delete-file.handler';

export const CommandHandlers = [
  UploadFileHandler,
  ProcessFileHandler,
  DeleteFileHandler,
];

export * from './upload-file.handler';
export * from './process-file.handler';
export * from './delete-file.handler';
