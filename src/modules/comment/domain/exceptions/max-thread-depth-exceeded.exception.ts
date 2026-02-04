import { DomainException } from '@core/domain';

/**
 * Max Thread Depth Exceeded Exception
 *
 * Story 6.2: Reply to comment
 *
 * Thrown when attempting to create a reply that would exceed
 * the maximum allowed thread depth (3 levels).
 */
export class MaxThreadDepthExceededException extends DomainException {
  constructor(maxDepth: number, currentDepth: number) {
    super(
      `Maximum thread depth exceeded. Cannot reply beyond ${maxDepth} levels (current: ${currentDepth}).`,
      'MAX_THREAD_DEPTH_EXCEEDED',
      { maxDepth, currentDepth },
    );
  }
}
