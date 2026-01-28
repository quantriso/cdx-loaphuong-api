import { GetCategoryHandler } from './get-category.handler';
import { ListCategoriesHandler } from './list-categories.handler';
import { GetActiveCategoriesHandler } from './get-active-categories.handler';

export const QueryHandlers = [
  GetCategoryHandler,
  ListCategoriesHandler,
  GetActiveCategoriesHandler,
];

export * from './get-category.handler';
export * from './list-categories.handler';
export * from './get-active-categories.handler';
