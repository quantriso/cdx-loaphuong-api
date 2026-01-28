import { ContentId } from '../../../../../../src/modules/content/domain/value-objects';
import { DomainException } from '@core/common';

describe('ContentId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid ContentId', () => {
      const contentId = new ContentId('content-123');

      expect(contentId.value).toBe('content-123');
      expect(contentId.toString()).toBe('content-123');
    });

    it('should accept UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const contentId = new ContentId(uuid);

      expect(contentId.value).toBe(uuid);
    });

    it('should throw DomainException when contentId is empty', () => {
      expect(() => new ContentId('')).toThrow(DomainException);
      expect(() => new ContentId('')).toThrow('Content ID cannot be empty');
    });

    it('should throw DomainException when contentId is only whitespace', () => {
      expect(() => new ContentId('   ')).toThrow(DomainException);
      expect(() => new ContentId('   ')).toThrow('Content ID cannot be empty');
    });

    it('should throw DomainException when contentId exceeds 36 characters', () => {
      const longId = 'a'.repeat(37);
      expect(() => new ContentId(longId)).toThrow(DomainException);
      expect(() => new ContentId(longId)).toThrow(
        'Content ID cannot exceed 36 characters',
      );
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID-format ContentId', () => {
      const contentId = ContentId.generate();

      expect(contentId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = ContentId.generate();
      const id2 = ContentId.generate();

      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('equals', () => {
    it('should return true for same contentId', () => {
      const contentId1 = new ContentId('content-123');
      const contentId2 = new ContentId('content-123');

      expect(contentId1.equals(contentId2)).toBe(true);
    });

    it('should return false for different contentIds', () => {
      const contentId1 = new ContentId('content-123');
      const contentId2 = new ContentId('content-456');

      expect(contentId1.equals(contentId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const contentId = new ContentId('content-123');

      expect(contentId.toString()).toBe('content-123');
    });
  });
});
