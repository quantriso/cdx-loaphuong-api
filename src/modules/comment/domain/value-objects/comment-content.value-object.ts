import { BaseValueObject } from '@core/domain';
import { CommentLengthExceededException } from '../exceptions/comment-length-exceeded.exception';

/**
 * Comment Content Value Object
 *
 * Story 6.1: Add comments on published content
 *
 * Represents the content of a comment with validation rules:
 * - Minimum length: 1 character
 * - Maximum length: 5000 characters
 * - Must not be empty or whitespace only
 */
export class CommentContent extends BaseValueObject {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 5000;

  constructor(public readonly value: string) {
    super();

    const trimmedContent = value.trim();

    if (trimmedContent.length < CommentContent.MIN_LENGTH) {
      throw new CommentLengthExceededException(
        `Comment content must be at least ${CommentContent.MIN_LENGTH} character`,
      );
    }

    if (value.length > CommentContent.MAX_LENGTH) {
      throw new CommentLengthExceededException(
        `Comment content cannot exceed ${CommentContent.MAX_LENGTH} characters`,
      );
    }
  }

  /**
   * Get the content value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Check if content contains a specific string
   */
  contains(text: string): boolean {
    return this.value.toLowerCase().includes(text.toLowerCase());
  }

  /**
   * Check if content starts with a specific string
   */
  startsWith(prefix: string): boolean {
    return this.value.startsWith(prefix);
  }

  /**
   * Check if content ends with a specific string
   */
  endsWith(suffix: string): boolean {
    return this.value.endsWith(suffix);
  }

  /**
   * Get the length of the content
   */
  get length(): number {
    return this.value.length;
  }

  /**
   * Check if content is empty (should never be true after creation)
   */
  isEmpty(): boolean {
    return this.value.length === 0;
  }

  /**
   * Check equality with another CommentContent
   */
  equals(other: CommentContent): boolean {
    if (!(other instanceof CommentContent)) {
      return false;
    }
    return this.value === other.value;
  }

  /**
   * Create a CommentContent instance with validation
   * Mentions array is optional and used for tracking mentioned users
   */
  static create(content: string, mentions?: string[]): CommentContent {
    return new CommentContent(content);
  }

  /**
   * Get a preview of the content (first N characters)
   */
  preview(maxLength: number = 100): string {
    if (this.value.length <= maxLength) {
      return this.value;
    }
    return this.value.substring(0, maxLength) + '...';
  }

  /**
   * Count occurrences of a substring
   */
  count(substring: string): number {
    const regex = new RegExp(substring, 'gi');
    const matches = this.value.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Check if content contains any of the given strings
   */
  containsAny(strings: string[]): boolean {
    return strings.some((str) => this.contains(str));
  }

  /**
   * Check if content contains all of the given strings
   */
  containsAll(strings: string[]): boolean {
    return strings.every((str) => this.contains(str));
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
