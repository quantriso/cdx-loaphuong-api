import { BaseValueObject, DomainException } from "@core/domain";

/**
 * Content Type Enum
 */
export enum ContentTypeEnum {
  ARTICLE = "ARTICLE",
  NEWS = "NEWS",
  ANNOUNCEMENT = "ANNOUNCEMENT",
  NOTICE = "NOTICE",
}

/**
 * Content Type Value Object
 *
 * Represents the category/type of content.
 * Immutable value object following DDD principles.
 */
export class ContentType extends BaseValueObject {
  private readonly _value: ContentTypeEnum;

  private constructor(value: ContentTypeEnum) {
    super();
    this._value = value;
  }

  get value(): ContentTypeEnum {
    return this._value;
  }

  // --- Factory Methods ---

  static article(): ContentType {
    return new ContentType(ContentTypeEnum.ARTICLE);
  }

  static news(): ContentType {
    return new ContentType(ContentTypeEnum.NEWS);
  }

  static announcement(): ContentType {
    return new ContentType(ContentTypeEnum.ANNOUNCEMENT);
  }

  static notice(): ContentType {
    return new ContentType(ContentTypeEnum.NOTICE);
  }

  static fromValue(value: string): ContentType {
    if (!Object.values(ContentTypeEnum).includes(value as ContentTypeEnum)) {
      throw new DomainException(`Invalid content type: ${value}`);
    }
    return new ContentType(value as ContentTypeEnum);
  }

  // --- State Checks ---

  isArticle(): boolean {
    return this._value === ContentTypeEnum.ARTICLE;
  }

  isNews(): boolean {
    return this._value === ContentTypeEnum.NEWS;
  }

  isAnnouncement(): boolean {
    return this._value === ContentTypeEnum.ANNOUNCEMENT;
  }

  isNotice(): boolean {
    return this._value === ContentTypeEnum.NOTICE;
  }

  toString(): string {
    return this._value;
  }

  protected getEqualityComponents(): unknown[] {
    return [this._value];
  }
}
