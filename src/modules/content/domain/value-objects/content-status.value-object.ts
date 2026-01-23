import { BaseValueObject, DomainException } from "@core/domain";

/**
 * Content Status Enum
 */
export enum ContentStatusEnum {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

/**
 * Content Status Value Object
 *
 * Represents the workflow state of content with state transition rules.
 * Immutable value object following DDD principles.
 */
export class ContentStatus extends BaseValueObject {
  private readonly _value: ContentStatusEnum;

  private constructor(value: ContentStatusEnum) {
    super();
    this._value = value;
  }

  get value(): ContentStatusEnum {
    return this._value;
  }

  // --- Factory Methods ---

  static draft(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.DRAFT);
  }

  static pending(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.PENDING);
  }

  static approved(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.APPROVED);
  }

  static rejected(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.REJECTED);
  }

  static published(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.PUBLISHED);
  }

  static archived(): ContentStatus {
    return new ContentStatus(ContentStatusEnum.ARCHIVED);
  }

  static fromValue(value: string): ContentStatus {
    if (!Object.values(ContentStatusEnum).includes(value as ContentStatusEnum)) {
      throw new DomainException(`Invalid content status: ${value}`);
    }
    return new ContentStatus(value as ContentStatusEnum);
  }

  // --- State Checks ---

  isDraft(): boolean {
    return this.value === ContentStatusEnum.DRAFT;
  }

  isPending(): boolean {
    return this.value === ContentStatusEnum.PENDING;
  }

  isApproved(): boolean {
    return this.value === ContentStatusEnum.APPROVED;
  }

  isRejected(): boolean {
    return this.value === ContentStatusEnum.REJECTED;
  }

  isPublished(): boolean {
    return this.value === ContentStatusEnum.PUBLISHED;
  }

  isArchived(): boolean {
    return this.value === ContentStatusEnum.ARCHIVED;
  }

  // --- State Transition Logic ---

  /**
   * Check if transition to new status is allowed
   */
  canTransitionTo(newStatus: ContentStatus): boolean {
    const transitions: Record<ContentStatusEnum, ContentStatusEnum[]> = {
      [ContentStatusEnum.DRAFT]: [ContentStatusEnum.PENDING],
      [ContentStatusEnum.PENDING]: [ContentStatusEnum.APPROVED, ContentStatusEnum.REJECTED],
      [ContentStatusEnum.APPROVED]: [ContentStatusEnum.PUBLISHED],
      [ContentStatusEnum.REJECTED]: [ContentStatusEnum.DRAFT],
      [ContentStatusEnum.PUBLISHED]: [ContentStatusEnum.ARCHIVED],
      [ContentStatusEnum.ARCHIVED]: [], // Cannot transition from archived
    };

    return transitions[this.value]?.includes(newStatus.value) ?? false;
  }

  /**
   * Transition to new status with validation
   */
  transitionTo(newStatus: ContentStatusEnum): ContentStatus {
    const newStatusVO = new ContentStatus(newStatus);

    if (!this.canTransitionTo(newStatusVO)) {
      throw new DomainException(
        `Invalid status transition from ${this.value} to ${newStatus}`
      );
    }

    return newStatusVO;
  }

  toString(): string {
    return this._value;
  }

  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }
}
