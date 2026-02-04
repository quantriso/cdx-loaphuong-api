import { BaseValueObject, DomainException } from '@core/domain';

/**
 * Comment ID Value Object
 * Ensures comment ID is always valid
 *
 * Using Value Object for ID provides:
 * - Type safety: Cannot mix CommentId with other string types
 * - Validation: ID is always valid when constructed
 * - DDD best practice: IDs are Value Objects
 * - Immutability: ID cannot be changed after creation
 */
export class CommentId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Comment ID cannot be empty');
    }

    if (value.length > 36) {
      throw new DomainException('Comment ID cannot exceed 36 characters');
    }
  }

  /**
   * Generate a new Comment ID
   */
  static generate(): CommentId {
    const id = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return new CommentId(id);
  }

  /**
   * Create Comment ID from existing string
   */
  static fromString(id: string): CommentId {
    return new CommentId(id);
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
