import { Injectable, Logger } from '@nestjs/common';
import type {
  IContentHistoryTracker,
  ContentHistoryEntry,
} from '../../domain/services/content-history.service';

/**
 * Content History Tracker Adapter (Infrastructure Implementation)
 *
 * Implements the IContentHistoryTracker port interface.
 * Located in Infrastructure Layer.
 *
 * Responsibility:
 * - Record content changes to persistent storage
 * - Query content history
 *
 * Note: This is a simplified in-memory implementation for MVP.
 * In production, this would use a database table (e.g., content_history).
 *
 * Schema Design (for future implementation):
 * ```sql
 * CREATE TABLE content_history (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   content_id UUID NOT NULL REFERENCES content(id),
 *   field VARCHAR(255) NOT NULL,
 *   old_value TEXT,
 *   new_value TEXT,
 *   user_id UUID NOT NULL,
 *   timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
 *   INDEX idx_content_history_content_id (content_id),
 *   INDEX idx_content_history_timestamp (timestamp)
 * );
 * ```
 *
 * Story 3.7: Edit Draft Content
 */
@Injectable()
export class ContentHistoryTrackerAdapter implements IContentHistoryTracker {
  private readonly _logger = new Logger(ContentHistoryTrackerAdapter.name);
  private readonly _history: Map<string, ContentHistoryEntry[]> = new Map();

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
  async recordChange(
    contentId: string,
    field: string,
    oldValue: any,
    newValue: any,
    userId: string,
  ): Promise<boolean> {
    try {
      const entry: ContentHistoryEntry = {
        id: crypto.randomUUID(),
        contentId,
        field,
        oldValue,
        newValue,
        userId,
        timestamp: new Date(),
      };

      // Get existing history for this content
      let history = this._history.get(contentId);
      if (!history) {
        history = [];
        this._history.set(contentId, history);
      }

      // Add new entry
      history.push(entry);

      this._logger.debug(
        `Recorded history entry for content ${contentId}, field: ${field}`,
      );

      return true;
    } catch (error) {
      this._logger.error(
        `Failed to record history for content ${contentId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get history for a content item
   *
   * @param contentId Content ID
   * @param limit Maximum number of history entries to return
   * @returns Array of history entries or empty array if not found
   */
  async getHistory(
    contentId: string,
    limit: number,
  ): Promise<ContentHistoryEntry[]> {
    try {
      const history = this._history.get(contentId);

      if (!history || history.length === 0) {
        this._logger.debug(`No history found for content ${contentId}`);
        return [];
      }

      // Return most recent entries first, limited by 'limit'
      const sortedHistory = [...history].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      return sortedHistory.slice(0, limit);
    } catch (error) {
      this._logger.error(
        `Failed to get history for content ${contentId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Clear all history for a content (utility method for testing)
   *
   * @param contentId Content ID
   */
  async clearHistory(contentId: string): Promise<void> {
    this._history.delete(contentId);
    this._logger.debug(`Cleared history for content ${contentId}`);
  }

  /**
   * Clear all history (utility method for testing)
   */
  async clearAllHistory(): Promise<void> {
    this._history.clear();
    this._logger.debug('Cleared all history');
  }
}
