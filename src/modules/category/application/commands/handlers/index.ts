import { CreateCategoryHandler } from './create-category.handler';
import { UpdateCategoryHandler } from './update-category.handler';
import { DeleteCategoryHandler } from './delete-category.handler';

export const CommandHandlers = [
  CreateCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
];

export * from './create-category.handler';
export * from './update-category.handler';
export * from './delete-category.handler';
