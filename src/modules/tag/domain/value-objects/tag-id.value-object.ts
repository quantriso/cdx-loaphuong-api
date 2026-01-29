import { BaseValueObject, DomainException } from '@core/domain';

/**
 * Tag ID Value Object
 * Ensures tag ID is always valid
 *
 * Using Value Object for ID provides:
 * - Type safety: Cannot mix TagId with other string types
 * - Validation: ID is always valid when constructed
 * - DDD best practice: IDs are Value Objects
 * - Immutability: ID cannot be changed after creation
 * - Future-proof: Can add sharding logic when needed
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class TagId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();

    if (!value || value.trim().length === 0) {
      throw new DomainException('Tag ID cannot be empty');
    }

    if (value.length > 36) {
      throw new DomainException('Tag ID cannot exceed 36 characters');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }

  /**
   * Generate a new Tag ID
   * Uses crypto.randomUUID() for browser/Node.js compatibility
   */
  static generate(): TagId {
    return new TagId(crypto.randomUUID());
  }
}
