import { UploadFileHandler } from './upload-file.handler';
import { ProcessFileHandler } from './process-file.handler';
import { DeleteFileHandler } from './delete-file.handler';
import { GetDownloadUrlHandler } from './get-download-url.handler';

export const CommandHandlers = [
  UploadFileHandler,
  ProcessFileHandler,
  DeleteFileHandler,
  GetDownloadUrlHandler,
];

export * from './upload-file.handler';
export * from './process-file.handler';
export * from './delete-file.handler';
export * from './get-download-url.handler';
