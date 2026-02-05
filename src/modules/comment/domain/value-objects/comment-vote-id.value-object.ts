import { BaseValueObject, DomainException } from '@core/domain';

/**
 * Comment Vote ID Value Object
 * Represents a unique identifier for a comment vote
 *
 * Using Value Object for ID provides:
 * - Type safety: Cannot mix CommentVoteId with other string types
 * - Validation: ID is always valid when constructed
 * - DDD best practice: IDs are Value Objects
 * - Immutability: ID cannot be changed after creation
 */
export class CommentVoteId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Comment Vote ID cannot be empty');
    }

    if (value.length > 50) {
      throw new DomainException('Comment Vote ID cannot exceed 50 characters');
    }
  }

  /**
   * Generate a new Comment Vote ID
   */
  static generate(): CommentVoteId {
    const id = `vote-${crypto.randomUUID()}`;
    return new CommentVoteId(id);
  }

  /**
   * Create Comment Vote ID from existing string
   */
  static fromString(id: string): CommentVoteId {
    return new CommentVoteId(id);
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
