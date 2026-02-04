import { Injectable } from '@nestjs/common';
import { CommentContent } from '../value-objects/comment-content.value-object';
import { CommentLengthExceededException } from '../exceptions/comment-length-exceeded.exception';

export interface Mention {
  userId: string;
  username: string;
  position: number;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent: string;
  mentions?: Mention[];
  error?: string;
}

@Injectable()
export class CommentValidationService {
  private readonly MAX_CONTENT_LENGTH = 5000;
  private readonly MENTION_PATTERN = /@(\w+)/g;
  private readonly FORBIDDEN_WORDS = ['spam', 'abuse']; // Can be extended

  validateCommentContent(content: string): ValidationResult {
    try {
      // Create value object which handles length validation
      const commentContent = new CommentContent(content);

      // Check for forbidden words
      const hasForbiddenWords = this.FORBIDDEN_WORDS.some((word) =>
        content.toLowerCase().includes(word),
      );

      if (hasForbiddenWords) {
        return {
          isValid: false,
          sanitizedContent: '',
          error: 'Comment contains inappropriate content',
        };
      }

      // Extract mentions
      const mentions = this.extractMentions(content);

      return {
        isValid: true,
        sanitizedContent: commentContent.value,
        mentions,
      };
    } catch (error) {
      if (error instanceof CommentLengthExceededException) {
        return {
          isValid: false,
          sanitizedContent: '',
          error: error.message,
        };
      }
      throw error;
    }
  }

  private extractMentions(content: string): Mention[] {
    const mentions: Mention[] = [];
    let match;

    // Reset regex state
    this.MENTION_PATTERN.lastIndex = 0;

    while ((match = this.MENTION_PATTERN.exec(content)) !== null) {
      mentions.push({
        userId: '', // Will be resolved by application service
        username: match[1],
        position: match.index,
      });
    }

    return mentions;
  }

  getMaxContentLength(): number {
    return this.MAX_CONTENT_LENGTH;
  }
}
