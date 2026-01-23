import { BaseValueObject, DomainException } from "@core/domain";

/**
 * Content Priority Enum
 */
export enum ContentPriorityEnum {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

/**
 * Content Priority Value Object
 *
 * Represents the priority/importance level of content.
 * Immutable value object following DDD principles.
 */
export class ContentPriority extends BaseValueObject {
  private readonly _value: ContentPriorityEnum;

  private constructor(value: ContentPriorityEnum) {
    super();
    this._value = value;
  }

  get value(): ContentPriorityEnum {
    return this._value;
  }

  // --- Factory Methods ---

  static low(): ContentPriority {
    return new ContentPriority(ContentPriorityEnum.LOW);
  }

  static medium(): ContentPriority {
    return new ContentPriority(ContentPriorityEnum.MEDIUM);
  }

  static high(): ContentPriority {
    return new ContentPriority(ContentPriorityEnum.HIGH);
  }

  static urgent(): ContentPriority {
    return new ContentPriority(ContentPriorityEnum.URGENT);
  }

  static fromValue(value: string): ContentPriority {
    if (!Object.values(ContentPriorityEnum).includes(value as ContentPriorityEnum)) {
      throw new DomainException(`Invalid content priority: ${value}`);
    }
    return new ContentPriority(value as ContentPriorityEnum);
  }

  // --- State Checks ---

  isLow(): boolean {
    return this._value === ContentPriorityEnum.LOW;
  }

  isMedium(): boolean {
    return this._value === ContentPriorityEnum.MEDIUM;
  }

  isHigh(): boolean {
    return this._value === ContentPriorityEnum.HIGH;
  }

  isUrgent(): boolean {
    return this._value === ContentPriorityEnum.URGENT;
  }

  toString(): string {
    return this._value;
  }

  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }
}
