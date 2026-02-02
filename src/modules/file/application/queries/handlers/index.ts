import { GetFileHandler } from './get-file.handler';
import { GetFileListHandler } from './get-file-list.handler';
import { DownloadFileHandler } from './download-file.handler';

export const QueryHandlers = [
  GetFileHandler,
  GetFileListHandler,
  DownloadFileHandler,
];

export * from './get-file.handler';
export * from './get-file-list.handler';
export * from './download-file.handler';
