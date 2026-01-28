import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import { Inject, Optional } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
  type IRequestContextProvider,
} from '@core/common';
import { REQUEST_CONTEXT_TOKEN } from '@core/constants';
import { CreateCategoryCommand } from '../create-category.command';
import { Category, CategoryId } from '../../../domain';
import type { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY_TOKEN } from '../../../constants/tokens';

/**
 * Create Category Command Handler
 *
 * Story 4.1: Manage Categories
 *
 * Handles creation of new categories with hierarchical structure.
 *
 * Business Flow:
 * 1. Validate category value is unique within tenant
 * 2. If parentId provided, validate parent exists and belongs to tenant
 * 3. Create Category aggregate
 * 4. Save aggregate (auto-publishes CategoryCreatedEvent)
 * 5. Return category ID
 *
 * CQRS Pattern:
 * - Command handler (write side)
 * - Returns category ID for reference
 * - Events published to event store
 */
@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<
  CreateCategoryCommand,
  string
> {
  constructor(
    @Inject(CATEGORY_REPOSITORY_TOKEN)
    private readonly categoryRepository: ICategoryRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<string> {
    // Generate category ID
    const categoryId = CategoryId.generate();

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
      tenantId,
      value,
      label,
      description,
      color,
      icon,
      sortOrder,
      parentId,
      createdBy,
    } = command;

    // 1. Check if category value already exists within tenant
    const existingCategory = await this.categoryRepository.findByValue(
      tenantId,
      value,
    );

    if (existingCategory) {
      throw new ConflictException(
        `Category with value '${value}' already exists`,
      );
    }

    // 2. If parentId provided, validate parent exists
    if (parentId) {
      const parent = await this.categoryRepository.getById(parentId);

      if (!parent) {
        throw new NotFoundException('Parent category', parentId);
      }

      if (parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent category', parentId);
      }
    }

    // 3. Create category aggregate with event metadata
    const category = Category.create(
      categoryId,
      {
        tenantId,
        value: value.toUpperCase(), // Normalize to uppercase
        label,
        description,
        color,
        icon,
        isActive: true, // Default to active
        sortOrder,
        parentId,
      },
      createdBy,
      eventMetadata,
    );

    // 4. Save aggregate (repository will publish domain events)
    await this.categoryRepository.save(category);

    // 5. Return category ID
    return categoryId.value;
  }
}
