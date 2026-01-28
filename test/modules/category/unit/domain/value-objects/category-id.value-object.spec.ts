import { CategoryId } from '../../../../../../src/modules/category/domain/value-objects';
import { DomainException } from '@core/common';

describe('CategoryId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid CategoryId', () => {
      const categoryId = new CategoryId('category-123');

      expect(categoryId.value).toBe('category-123');
      expect(categoryId.toString()).toBe('category-123');
    });

    it('should accept UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const categoryId = new CategoryId(uuid);

      expect(categoryId.value).toBe(uuid);
    });

    it('should throw DomainException when categoryId is empty', () => {
      expect(() => new CategoryId('')).toThrow(DomainException);
      expect(() => new CategoryId('')).toThrow('Category ID cannot be empty');
    });

    it('should throw DomainException when categoryId is only whitespace', () => {
      expect(() => new CategoryId('   ')).toThrow(DomainException);
      expect(() => new CategoryId('   ')).toThrow('Category ID cannot be empty');
    });

    it('should throw DomainException when categoryId exceeds 36 characters', () => {
      const longId = 'a'.repeat(37);
      expect(() => new CategoryId(longId)).toThrow(DomainException);
      expect(() => new CategoryId(longId)).toThrow(
        'Category ID cannot exceed 36 characters',
      );
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID-format CategoryId', () => {
      const categoryId = CategoryId.generate();

      expect(categoryId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = CategoryId.generate();
      const id2 = CategoryId.generate();

      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('equals', () => {
    it('should return true for same categoryId', () => {
      const categoryId1 = new CategoryId('category-123');
      const categoryId2 = new CategoryId('category-123');

      expect(categoryId1.equals(categoryId2)).toBe(true);
    });

    it('should return false for different categoryIds', () => {
      const categoryId1 = new CategoryId('category-123');
      const categoryId2 = new CategoryId('category-456');

      expect(categoryId1.equals(categoryId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const categoryId = new CategoryId('category-123');

      expect(categoryId.toString()).toBe('category-123');
    });
  });
});
