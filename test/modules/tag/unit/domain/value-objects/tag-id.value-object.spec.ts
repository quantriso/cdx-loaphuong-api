import { TagId } from '../../../../../../src/modules/tag/domain/value-objects/tag-id.value-object';
import { DomainException } from '@core/common';

describe('TagId Value Object', () => {
  describe('constructor', () => {
    it('should create a valid TagId', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const tagId = new TagId(id);

      expect(tagId.value).toBe(id);
    });

    it('should throw DomainException when value is empty', () => {
      expect(() => new TagId('')).toThrow(DomainException);
      expect(() => new TagId('')).toThrow('Tag ID cannot be empty');
    });

    it('should throw DomainException when value is only whitespace', () => {
      expect(() => new TagId('   ')).toThrow(DomainException);
      expect(() => new TagId('   ')).toThrow('Tag ID cannot be empty');
    });

    it('should throw DomainException when value exceeds 36 characters', () => {
      const longId = 'a'.repeat(37);
      expect(() => new TagId(longId)).toThrow(DomainException);
      expect(() => new TagId(longId)).toThrow(
        'Tag ID cannot exceed 36 characters',
      );
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID', () => {
      const tagId = TagId.generate();

      expect(tagId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const tagId1 = TagId.generate();
      const tagId2 = TagId.generate();

      expect(tagId1.value).not.toBe(tagId2.value);
    });
  });

  describe('equals', () => {
    it('should be equal when values are the same', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const tagId1 = new TagId(id);
      const tagId2 = new TagId(id);

      expect(tagId1.equals(tagId2)).toBe(true);
    });

    it('should not be equal when values are different', () => {
      const tagId1 = new TagId('550e8400-e29b-41d4-a716-446655440000');
      const tagId2 = new TagId('550e8400-e29b-41d4-a716-446655440001');

      expect(tagId1.equals(tagId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value as a string', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const tagId = new TagId(id);

      expect(tagId.toString()).toBe(id);
    });
  });
});
