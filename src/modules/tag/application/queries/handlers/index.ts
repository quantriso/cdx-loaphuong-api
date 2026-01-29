import { GetTagHandler } from './get-tag.handler';
import { ListTagsHandler } from './list-tags.handler';

export const QueryHandlers = [GetTagHandler, ListTagsHandler];

export * from './get-tag.handler';
export * from './list-tags.handler';
