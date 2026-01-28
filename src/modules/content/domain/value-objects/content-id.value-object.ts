import { BaseValueObject } from '@core/domain';
import { DomainException } from '@core/common';

/**
 * Content ID Value Object
 *
 * Represents a unique identifier for Content aggregates.
 * Provides type safety and validation for content IDs.
 *
 * Validation Rules:
 * - Must not be empty or whitespace
 * - Must not exceed 36 characters (UUID format)
 *
 * Future Enhancements:
 * - Sharding support via getShardKey()
 * - Multi-region support via getRegion()
 * - Composite key support via fromComposite()
 */
export class ContentId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Content ID cannot be empty');
    }

    if (value.length > 36) {
      throw new DomainException('Content ID cannot exceed 36 characters');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }

  /**
   * Generate a new Content ID using UUID v4
   */
  static generate(): ContentId {
    return new ContentId(crypto.randomUUID());
  }
}
