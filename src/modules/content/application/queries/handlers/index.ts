import { GetContentHandler } from './get-content.handler';
import { GetContentHistoryHandler } from './get-content-history.handler';

export const QueryHandlers = [GetContentHandler, GetContentHistoryHandler];

export * from './get-content.handler';
export * from './get-content-history.handler';
