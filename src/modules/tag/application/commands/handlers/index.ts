import { CreateTagHandler } from './create-tag.handler';
import { UpdateTagHandler } from './update-tag.handler';
import { DeleteTagHandler } from './delete-tag.handler';
import { BulkCreateTagsHandler } from './bulk-create-tags.handler';

export const CommandHandlers = [
  CreateTagHandler,
  UpdateTagHandler,
  DeleteTagHandler,
  BulkCreateTagsHandler,
];

export * from './create-tag.handler';
export * from './update-tag.handler';
export * from './delete-tag.handler';
export * from './bulk-create-tags.handler';
