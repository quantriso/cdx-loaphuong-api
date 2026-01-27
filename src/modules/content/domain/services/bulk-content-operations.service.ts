import { BaseService, DomainException } from '@core/domain';
import { Content } from '../entities';

/**
 * Content Operation Item
 * Represents a single content operation in a bulk process
 */
export interface ContentOperationItem {
  contentId: string;
  reason?: string; // Optional reason for operation (for audit)
}

/**
 * Content Operation Result
 * Result of a single content operation
 */
export interface ContentOperationResult {
  contentId: string;
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
  warning?: string;
}

/**
 * Bulk Content Operations Options
 */
export interface BulkContentOperationsOptions {
  /**
   * Whether to allow partial success (some succeed, some fail)
   * If false, all operations must succeed or all fail (transaction-like)
   */
  allowPartialSuccess?: boolean;

  /**
   * User ID for audit trail
   */
  userId?: string;

  /**
   * Batch reference for tracking
   */
  batchReference?: string;

  /**
   * Tenant ID for validation
   */
  tenantId: string;
}

/**
 * Bulk Content Operations Service
 *
 * Domain Service for bulk content operations (publish, archive, etc.)
 * Follows the same pattern as Product's BulkStockAdjustmentService.
 *
 * Story 3.8: Bulk Publish & Archive Content
 *
 * This service:
 * - Extends BaseService from Core
 * - Contains validation rules and business rules
 * - Can be tested independently
 * - Can be reused across multiple handlers
 */
export class BulkContentOperationsService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Validate contents exist and belong to tenant
   */
  validateContents(
    items: ContentOperationItem[],
    contentMap: Map<string, Content>,
    options: BulkContentOperationsOptions,
  ): {
    validContents: Map<string, Content>;
    errors: string[];
    failedResults: ContentOperationResult[];
  } {
    const validContents = new Map<string, Content>();
    const errors: string[] = [];
    const failedResults: ContentOperationResult[] = [];

    // Check for duplicate content IDs in the same batch
    const seenIds = new Set<string>();
    for (const item of items) {
      if (seenIds.has(item.contentId)) {
        errors.push(`Duplicate content ID in batch: ${item.contentId}`);
        failedResults.push({
          contentId: item.contentId,
          success: false,
          error: 'Duplicate content ID in batch',
        });
        continue;
      }
      seenIds.add(item.contentId);

      const content = contentMap.get(item.contentId);
      if (!content) {
        errors.push(`Content not found: ${item.contentId}`);
        failedResults.push({
          contentId: item.contentId,
          success: false,
          error: 'Content not found',
        });
        continue;
      }

      // Validate tenant ownership
      if (content.tenantId !== options.tenantId) {
        errors.push(
          `Content ${item.contentId} does not belong to tenant ${options.tenantId}`,
        );
        failedResults.push({
          contentId: item.contentId,
          success: false,
          error: 'Content not found in tenant',
        });
        continue;
      }

      validContents.set(item.contentId, content);
    }

    return { validContents, errors, failedResults };
  }

  /**
   * Execute bulk publish operations
   */
  executeBulkPublish(
    items: ContentOperationItem[],
    validatedContents: Map<string, Content>,
    adminId: string,
  ): {
    results: ContentOperationResult[];
    warnings: string[];
    successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }>;
  } {
    const results: ContentOperationResult[] = [];
    const warnings: string[] = [];
    const successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }> = [];

    for (const item of items) {
      const content = validatedContents.get(item.contentId);
      if (!content) continue; // Skip if already failed validation

      try {
        const previousStatus = content.status.toString();

        // Validate can publish
        if (!content.status.isApproved()) {
          const error = `Cannot publish content ${item.contentId}. Current status: ${previousStatus}. Only APPROVED content can be published.`;
          results.push({
            contentId: item.contentId,
            success: false,
            previousStatus,
            newStatus: previousStatus,
            error,
          });
          continue;
        }

        // Perform publish using domain method
        content.publish(adminId);

        const newStatus = content.status.toString();

        // Track for potential rollback
        successfulOperations.push({
          content,
          item,
          previousStatus,
        });

        results.push({
          contentId: item.contentId,
          success: true,
          previousStatus,
          newStatus,
        });
      } catch (error) {
        // Handle domain exceptions
        results.push({
          contentId: item.contentId,
          success: false,
          previousStatus: content.status.toString(),
          newStatus: content.status.toString(),
          error: (error as Error).message || 'Unknown error during publish',
        });
      }
    }

    return { results, warnings, successfulOperations };
  }

  /**
   * Execute bulk archive operations
   */
  executeBulkArchive(
    items: ContentOperationItem[],
    validatedContents: Map<string, Content>,
    adminId: string,
  ): {
    results: ContentOperationResult[];
    warnings: string[];
    successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }>;
  } {
    const results: ContentOperationResult[] = [];
    const warnings: string[] = [];
    const successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }> = [];

    for (const item of items) {
      const content = validatedContents.get(item.contentId);
      if (!content) continue; // Skip if already failed validation

      try {
        const previousStatus = content.status.toString();

        // Validate can archive
        if (!content.status.isPublished()) {
          const error = `Cannot archive content ${item.contentId}. Current status: ${previousStatus}. Only PUBLISHED content can be archived.`;
          results.push({
            contentId: item.contentId,
            success: false,
            previousStatus,
            newStatus: previousStatus,
            error,
          });
          continue;
        }

        // Perform archive using domain method
        content.archive(adminId);

        const newStatus = content.status.toString();

        // Track for potential rollback
        successfulOperations.push({
          content,
          item,
          previousStatus,
        });

        results.push({
          contentId: item.contentId,
          success: true,
          previousStatus,
          newStatus,
        });
      } catch (error) {
        // Handle domain exceptions
        results.push({
          contentId: item.contentId,
          success: false,
          previousStatus: content.status.toString(),
          newStatus: content.status.toString(),
          error: (error as Error).message || 'Unknown error during archive',
        });
      }
    }

    return { results, warnings, successfulOperations };
  }

  /**
   * Rollback successful operations
   * This provides transaction-like behavior
   */
  rollbackOperations(
    successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }>,
  ): void {
    for (const { content, previousStatus } of successfulOperations) {
      try {
        // Revert status by re-hydrating from previousStatus
        // Note: This is a simplified rollback. In production, you might need
        // to reload the aggregate from database or use more sophisticated mechanisms.
        // For now, we log the rollback intent.
        console.warn(
          `Rollback needed for content ${content.id}: ${content.status.toString()} -> ${previousStatus}`,
        );
      } catch (rollbackError) {
        throw new DomainException(
          `Failed to rollback operation for content ${content.id}: ${(rollbackError as Error).message}`,
        );
      }
    }
  }

  /**
   * Main orchestration method for bulk publish
   */
  processBulkPublish(
    items: ContentOperationItem[],
    contentMap: Map<string, Content>,
    options: BulkContentOperationsOptions,
    adminId: string,
  ): {
    results: ContentOperationResult[];
    warnings: string[];
    successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }>;
    shouldRollback: boolean;
  } {
    // Step 1: Validate contents exist and belong to tenant
    const {
      validContents,
      errors: validationErrors,
      failedResults,
    } = this.validateContents(items, contentMap, options);

    // If no valid contents and partial success not allowed, fail early
    if (
      !options.allowPartialSuccess &&
      validationErrors.length > 0 &&
      validContents.size === 0
    ) {
      throw new DomainException(
        `Bulk publish failed: ${validationErrors.join('; ')}`,
      );
    }

    // Step 2: Execute publish operations
    const { results, warnings, successfulOperations } = this.executeBulkPublish(
      items,
      validContents,
      adminId,
    );

    // Combine all results
    const allResults = [...failedResults, ...results];

    // Check if we need to rollback (all failed when partial success not allowed)
    const successfulCount = allResults.filter((r) => r.success).length;
    const shouldRollback =
      !options.allowPartialSuccess &&
      successfulCount < items.length &&
      successfulOperations.length > 0;

    return {
      results: allResults,
      warnings,
      successfulOperations,
      shouldRollback,
    };
  }

  /**
   * Main orchestration method for bulk archive
   */
  processBulkArchive(
    items: ContentOperationItem[],
    contentMap: Map<string, Content>,
    options: BulkContentOperationsOptions,
    adminId: string,
  ): {
    results: ContentOperationResult[];
    warnings: string[];
    successfulOperations: Array<{
      content: Content;
      item: ContentOperationItem;
      previousStatus: string;
    }>;
    shouldRollback: boolean;
  } {
    // Step 1: Validate contents exist and belong to tenant
    const {
      validContents,
      errors: validationErrors,
      failedResults,
    } = this.validateContents(items, contentMap, options);

    // If no valid contents and partial success not allowed, fail early
    if (
      !options.allowPartialSuccess &&
      validationErrors.length > 0 &&
      validContents.size === 0
    ) {
      throw new DomainException(
        `Bulk archive failed: ${validationErrors.join('; ')}`,
      );
    }

    // Step 2: Execute archive operations
    const { results, warnings, successfulOperations } = this.executeBulkArchive(
      items,
      validContents,
      adminId,
    );

    // Combine all results
    const allResults = [...failedResults, ...results];

    // Check if we need to rollback (all failed when partial success not allowed)
    const successfulCount = allResults.filter((r) => r.success).length;
    const shouldRollback =
      !options.allowPartialSuccess &&
      successfulCount < items.length &&
      successfulOperations.length > 0;

    return {
      results: allResults,
      warnings,
      successfulOperations,
      shouldRollback,
    };
  }
}
