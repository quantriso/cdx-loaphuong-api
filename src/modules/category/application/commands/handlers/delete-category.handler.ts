import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import {
  DomainException,
  NotFoundException,
  type IRequestContextProvider,
} from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { DeleteCategoryCommand } from '../delete-category.command';
import type { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Delete Category Command Handler
 *
 * Story 4.1: Manage Categories
 *
 * Handles deletion of categories.
 *
 * Business Flow:
 * 1. Load category aggregate
 * 2. Verify tenant ownership
 * 3. Check for child categories (cannot delete with children)
 * 4. Mark aggregate as deleted
 * 5. Delete aggregate (auto-publishes CategoryDeletedEvent)
 *
 * Business Rules:
 * - Cannot delete category with child categories
 * - Content using this category should be handled by event listeners
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - No return value needed
 * - Events published to event store
 */
@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<
  DeleteCategoryCommand,
  void
> {
  constructor(
    @Inject(CATEGORY_REPOSITORY_TOKEN)
    private readonly categoryRepository: ICategoryRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    // Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;
    const { id, tenantId, deletedBy } = command;

    // 1. Load aggregate
    const category = await this.categoryRepository.getById(id);

    if (!category) {
      throw new NotFoundException('Category', id);
    }

    // 2. Verify tenant ownership
    if (category.tenantId !== tenantId) {
      throw new NotFoundException('Category', id);
    }

    // 3. Check for child categories
    const childCount = await this.categoryRepository.countChildren(
      id,
      tenantId,
    );

    if (childCount > 0) {
      throw new DomainException(
        `Cannot delete category with ${childCount} child categories. Delete or reassign children first.`,
      );
    }

    // 4. Mark aggregate as deleted (emits event with metadata)
    category.markAsDeleted(deletedBy, eventMetadata);

    // 5. Save aggregate (repository will publish domain events)
    await this.categoryRepository.save(category);
  }
}
