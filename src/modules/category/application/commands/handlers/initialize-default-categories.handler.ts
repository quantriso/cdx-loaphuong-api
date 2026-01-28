import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import type { ICommandHandler } from '@core/application';
import { CommandHandler } from '@shared/cqrs';
import {
  ConflictException,
  type IRequestContextProvider,
} from '@core/common';
import { REQUEST_CONTEXT_TOKEN, SYSTEM_USER } from '@core/constants';

import { InitializeDefaultCategoriesCommand } from '../initialize-default-categories.command';
import { Category, CategoryId } from '../../../domain';
import type { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY_TOKEN } from '../../../constants/tokens';
import { DEFAULT_CATEGORIES } from '../../../constants/default-categories';

/**
 * Initialize Default Categories Handler
 *
 * Story 4.2: Initialize Default Categories
 */
@CommandHandler(InitializeDefaultCategoriesCommand)
export class InitializeDefaultCategoriesHandler
  implements ICommandHandler<InitializeDefaultCategoriesCommand>
{
  private readonly logger = new Logger(InitializeDefaultCategoriesHandler.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY_TOKEN)
    private readonly categoryRepository: ICategoryRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: InitializeDefaultCategoriesCommand): Promise<void> {
    const { tenantId } = command;

    const context = this.requestContext?.current();
    const eventMetadata = context
      ? {
          correlationId: context.correlationId,
          causationId: context.causationId,
          userId: context.userId,
        }
      : undefined;

    this.logger.log(`Initializing default categories for tenant: ${tenantId}`);

    await this.validateTenantHasNoCategories(tenantId);
    await this.createDefaultCategories(tenantId, eventMetadata);

    this.logger.log(
      `Default categories initialized successfully for tenant: ${tenantId} (count: ${DEFAULT_CATEGORIES.length})`,
    );
  }

  private async validateTenantHasNoCategories(tenantId: string): Promise<void> {
    const existingCount = await this.categoryRepository.countByTenantId(
      tenantId,
    );

    if (existingCount > 0) {
      this.logger.warn(
        `Categories already exist for tenant: ${tenantId} (count: ${existingCount})`,
      );
      throw new ConflictException(
        'Categories already initialized for this tenant',
      );
    }
  }

  private async createDefaultCategories(
    tenantId: string,
    eventMetadata?: any,
  ): Promise<void> {
    for (const categoryConfig of DEFAULT_CATEGORIES) {
      const categoryId = CategoryId.generate();

      const category = Category.create(
        categoryId,
        {
          tenantId,
          value: categoryConfig.value,
          label: categoryConfig.label,
          description: categoryConfig.description,
          color: categoryConfig.color,
          icon: categoryConfig.icon,
          isActive: categoryConfig.isActive,
          sortOrder: categoryConfig.sortOrder,
          parentId: null,
        },
        SYSTEM_USER,
        eventMetadata,
      );

      await this.categoryRepository.save(category);
    }
  }
}
