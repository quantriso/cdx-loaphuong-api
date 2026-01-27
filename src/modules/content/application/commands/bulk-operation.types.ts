import type {
  ContentOperationItem,
  ContentOperationResult,
} from '../../domain/services';

/**
 * Re-export from domain for convenience
 */
export type { ContentOperationItem };

/**
 * Bulk Operation Result
 * Result of a bulk content operation
 *
 * Aggregates results from multiple ContentOperationResult items.
 * This is an application-layer concern for returning data to controllers.
 */
export interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: ContentOperationResult[];
  warnings?: string[];
  batchReference?: string;
}
