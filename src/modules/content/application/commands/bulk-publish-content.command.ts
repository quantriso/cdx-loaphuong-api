import { ICommand } from '@core/application';
import type {
  ContentOperationItem,
  BulkOperationResult,
} from './bulk-operation.types';

// Re-export for convenience
export type { ContentOperationItem, BulkOperationResult };

/**
 * Bulk Publish Content Command
 *
 * Story 3.8: Bulk Publish Content
 *
 * Allows publishing multiple approved contents in a single operation.
 * Follows the same pattern as Product's BulkStockAdjustmentCommand.
 */
export class BulkPublishContentCommand implements ICommand {
  constructor(
    public readonly items: ContentOperationItem[],
    public readonly adminId: string,
    public readonly tenantId: string,
    public readonly options?: {
      /**
       * Whether to allow partial success (some succeed, some fail)
       * If false, all operations must succeed or all fail (transaction-like)
       */
      allowPartialSuccess?: boolean;

      /**
       * Batch reference for tracking
       */
      batchReference?: string;
    },
  ) {
    // Validate command structure
    if (!items || items.length === 0) {
      throw new Error('At least one content is required');
    }

    if (items.length > 100) {
      throw new Error('Cannot process more than 100 contents at once');
    }

    // Validate each item
    items.forEach((item, index) => {
      if (!item.contentId || item.contentId.trim().length === 0) {
        throw new Error(`Item at index ${index}: contentId is required`);
      }
    });

    if (!adminId || adminId.trim().length === 0) {
      throw new Error('adminId is required');
    }

    if (!tenantId || tenantId.trim().length === 0) {
      throw new Error('tenantId is required');
    }
  }
}
