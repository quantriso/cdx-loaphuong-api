import { BaseValueObject } from '@core/domain';
import { DomainException } from '@core/domain';

/**
 * Tenant Status Enum
 *
 * Defines all possible tenant statuses in the system
 */
export enum TenantStatusEnum {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

/**
 * Valid Status Transitions
 *
 * Defines the state machine for tenant status transitions.
 * This enforces business rules at the domain level.
 */
const VALID_TRANSITIONS: Record<TenantStatusEnum, TenantStatusEnum[]> = {
  [TenantStatusEnum.ACTIVE]: [
    TenantStatusEnum.SUSPENDED, // Can suspend active tenant
    TenantStatusEnum.DELETED, // Can delete active tenant
  ],
  [TenantStatusEnum.SUSPENDED]: [
    TenantStatusEnum.ACTIVE, // Can reactivate suspended tenant
    TenantStatusEnum.DELETED, // Can delete suspended tenant
  ],
  [TenantStatusEnum.DELETED]: [], // Cannot transition from DELETED (terminal state)
};

/**
 * Tenant Status Value Object
 *
 * Encapsulates tenant status with business logic and state machine validation.
 *
 * Benefits of using Value Object:
 * - Type safety: Cannot assign invalid status values
 * - Immutability: Status transitions create new instances
 * - Business logic: Validates state transitions via state machine
 * - Self-documenting: Factory methods and helper methods make code clearer
 *
 * Example Usage:
 * ```typescript
 * const status = TenantStatus.active();
 *
 * // Valid transition
 * const suspended = status.transitionTo(TenantStatusEnum.SUSPENDED); // ✅ Works
 *
 * // Invalid transition
 * const deleted = TenantStatus.deleted();
 * deleted.transitionTo(TenantStatusEnum.ACTIVE); // ❌ Throws DomainException
 * ```
 */
export class TenantStatus extends BaseValueObject {
  private readonly _value: TenantStatusEnum;

  /**
   * Private constructor to enforce factory methods usage
   *
   * @param value Status enum value
   */
  private constructor(value: TenantStatusEnum) {
    super();
    this._value = value;
  }

  /**
   * Get the raw enum value
   */
  get value(): TenantStatusEnum {
    return this._value;
  }

  // --- Factory Methods ---

  /**
   * Create ACTIVE status (default for new tenants)
   */
  static active(): TenantStatus {
    return new TenantStatus(TenantStatusEnum.ACTIVE);
  }

  /**
   * Create SUSPENDED status
   */
  static suspended(): TenantStatus {
    return new TenantStatus(TenantStatusEnum.SUSPENDED);
  }

  /**
   * Create DELETED status
   */
  static deleted(): TenantStatus {
    return new TenantStatus(TenantStatusEnum.DELETED);
  }

  /**
   * Create from enum value (for reconstitution from database)
   *
   * @param value Status enum value
   */
  static fromValue(value: string): TenantStatus {
    const enumValue = value as TenantStatusEnum;

    if (!Object.values(TenantStatusEnum).includes(enumValue)) {
      throw new DomainException(
        `Invalid tenant status: ${value}`,
        'INVALID_TENANT_STATUS',
        {
          providedValue: value,
          validValues: Object.values(TenantStatusEnum),
        },
      );
    }

    return new TenantStatus(enumValue);
  }

  // --- State Machine Logic ---

  /**
   * Check if transition to new status is valid
   *
   * @param newStatus Target status to transition to
   * @returns true if transition is valid, false otherwise
   */
  canTransitionTo(newStatus: TenantStatusEnum): boolean {
    return VALID_TRANSITIONS[this._value].includes(newStatus);
  }

  /**
   * Transition to new status with validation
   *
   * Returns a new TenantStatus instance (immutable pattern).
   * Throws DomainException if transition is invalid.
   *
   * @param newStatus Target status
   * @returns New TenantStatus instance
   * @throws DomainException if transition is invalid
   */
  transitionTo(newStatus: TenantStatusEnum): TenantStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Invalid status transition from ${this._value} to ${newStatus}`,
        'INVALID_TENANT_STATUS_TRANSITION',
        {
          currentStatus: this._value,
          requestedStatus: newStatus,
          validTransitions: VALID_TRANSITIONS[this._value],
        },
      );
    }

    return new TenantStatus(newStatus);
  }

  // --- Helper Methods ---

  /**
   * Check if tenant is active
   */
  isActive(): boolean {
    return this._value === TenantStatusEnum.ACTIVE;
  }

  /**
   * Check if tenant is suspended
   */
  isSuspended(): boolean {
    return this._value === TenantStatusEnum.SUSPENDED;
  }

  /**
   * Check if tenant is deleted (terminal state)
   */
  isDeleted(): boolean {
    return this._value === TenantStatusEnum.DELETED;
  }

  // --- Value Object Contract ---

  /**
   * Compare two TenantStatus instances for equality
   */
  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON representation (for serialization)
   */
  toJSON(): string {
    return this._value;
  }
}
