import { Inject } from '@nestjs/common';
import { DomainException } from '@core/common';
import { CONTENT_HISTORY_TRACKER_TOKEN } from '../../constants/tokens';

/**
 * Content History Entry
 *
 * Represents a single history entry
 */
export interface ContentHistoryEntry {
  id: string;
  contentId: string;
  field: string;
  oldValue: any;
  newValue: any;
  userId: string;
  timestamp: Date;
}

/**
 * Content History Tracker Interface (Port)
 *
 * Interface cho việc tracking history của Content.
 * Được định nghĩa ở Domain Layer.
 * Infrastructure Layer sẽ implement.
 */
export interface IContentHistoryTracker {
  /**
   * Record a content change in history
   *
   * @param contentId Content ID
   * @param field Field that was changed
   * @param oldValue Previous value
   * @param newValue New value
   * @param userId User who made the change
   * @returns true if successful, false otherwise
   */
  recordChange(
    contentId: string,
    field: string,
    oldValue: any,
    newValue: any,
    userId: string,
  ): Promise<boolean>;

  /**
   * Get history for a content item
   *
   * @param contentId Content ID
   * @param limit Maximum number of history entries to return
   * @returns Array of history entries or empty array if not found
   */
  getHistory(contentId: string, limit: number): Promise<ContentHistoryEntry[]>;
}

/**
 * Content History Service
 *
 * Domain Service đảm bảo business rules về history tracking:
 * - Log all content edits with metadata
 * - Store: contentId, field, oldValue, newValue, userId, timestamp
 * - Query: getHistory(contentId, limit)
 *
 * Tại sao đây là Domain Service?
 * - History tracking là business requirement thuộc về Domain
 * - Logic này không thuộc về một Aggregate cụ thể
 * - Cần truy query database/external storage → sử dụng Port interface
 *
 * Exception Strategy:
 * - Uses DomainException for tracking failures
 * - Fails gracefully for read operations (null instead of exception)
 *
 * Story 3.7: Edit Draft Content
 *
 * @example
 * ```typescript
 * // Trong Command Handler
 * const historyService = new ContentHistoryService(historyTracker);
 * await historyService.recordChange(contentId, 'title', oldTitle, newTitle, userId);
 * ```
 */
export class ContentHistoryService {
  constructor(
    @Inject(CONTENT_HISTORY_TRACKER_TOKEN)
    private readonly tracker: IContentHistoryTracker,
  ) {}

  /**
   * Record a content change in history
   *
   * @param contentId Content ID
   * @param field Field that was changed
   * @param oldValue Previous value
   * @param newValue New value
   * @param userId User who made the change
   * @throws DomainException if recording fails
   */
  async recordChange(
    contentId: string,
    field: string,
    oldValue: any,
    newValue: any,
    userId: string,
  ): Promise<void> {
    // Use the port interface to record the change
    const success = await this.tracker.recordChange(
      contentId,
      field,
      oldValue,
      newValue,
      userId,
    );

    if (!success) {
      throw new DomainException(
        `Failed to record history for content ${contentId}`,
        'HISTORY_RECORDING_FAILED',
        { contentId, field },
      );
    }
  }

  /**
   * Get history for a content item
   *
   * @param contentId Content ID
   * @param limit Maximum number of history entries to return
   * @returns History entries or empty array if not found
   */
  async getHistory(
    contentId: string,
    limit: number = 50,
  ): Promise<ContentHistoryEntry[]> {
    // Use the port interface to get history
    return await this.tracker.getHistory(contentId, limit);
  }

  /**
   * Record multiple changes at once (batch)
   *
   * @param contentId Content ID
   * @param changes Array of change objects
   * @param userId User who made the changes
   * @throws DomainException if batch recording fails
   */
  async recordBatchChanges(
    contentId: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    userId: string,
  ): Promise<void> {
    for (const change of changes) {
      await this.recordChange(
        contentId,
        change.field,
        change.oldValue,
        change.newValue,
        userId,
      );
    }
  }
}
