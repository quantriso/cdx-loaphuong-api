import { GetContentHandler } from './get-content.handler';
import { GetContentHistoryHandler } from './get-content-history.handler';
import { ListContentsHandler } from './list-contents.handler';

export const QueryHandlers = [
  GetContentHandler,
  GetContentHistoryHandler,
  ListContentsHandler,
];

export * from './get-content.handler';
export * from './get-content-history.handler';
export * from './list-contents.handler';
