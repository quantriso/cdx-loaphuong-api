import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import { NotFoundException, type IRequestContextProvider } from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { UpdateCategoryCommand } from '../update-category.command';
import type { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Update Category Command Handler
 *
 * Story 4.1: Manage Categories
 *
 * Handles updating existing categories.
 *
 * Business Flow:
 * 1. Load category aggregate
 * 2. Verify tenant ownership
 * 3. If parentId changing, validate new parent
 * 4. Update aggregate
 * 5. Save aggregate (auto-publishes CategoryUpdatedEvent)
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - No return value needed
 * - Events published to event store
 */
@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<
  UpdateCategoryCommand,
  void
> {
  constructor(
    @Inject(CATEGORY_REPOSITORY_TOKEN)
    private readonly categoryRepository: ICategoryRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<void> {
    // Get request context for distributed tracing
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    const {
      id,
      tenantId,
      label,
      description,
      color,
      icon,
      isActive,
      sortOrder,
      parentId,
      updatedBy,
    } = command;

    // 1. Load aggregate
    const category = await this.categoryRepository.getById(id);

    if (!category) {
      throw new NotFoundException('Category', id);
    }

    // 2. Verify tenant ownership
    if (category.tenantId !== tenantId) {
      throw new NotFoundException('Category', id);
    }

    // 3. If parentId changing, validate new parent
    if (parentId !== undefined && parentId !== null) {
      // Prevent setting parent to self
      if (parentId === id) {
        throw new Error('Cannot set category as its own parent');
      }

      const parent = await this.categoryRepository.getById(parentId);

      if (!parent) {
        throw new NotFoundException('Parent category', parentId);
      }

      if (parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent category', parentId);
      }
    }

    // 4. Update aggregate with event metadata
    category.update(
      {
        label,
        description,
        color,
        icon,
        isActive,
        sortOrder,
        parentId,
      },
      updatedBy,
      eventMetadata,
    );

    // 5. Save aggregate (repository will publish domain events)
    await this.categoryRepository.save(category);
  }
}
