import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  BulkCreateTagsDto,
  BulkCreateTagItemDto,
} from './bulk-create-tags.dto';

describe('BulkCreateTagItemDto', () => {
  it('should pass validation with valid data', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: 'Covid-19',
      color: '#FF9900',
      category: 'HEALTH',
      synonyms: ['coronavirus', 'sars-cov-2'],
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should fail validation when name is empty', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: '',
      color: '#FF9900',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when name exceeds 50 characters', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: 'a'.repeat(51),
      color: '#FF9900',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when color is not a valid hex', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: 'Covid-19',
      color: 'invalid-color',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('color');
  });

  it('should pass validation when category is optional and not provided', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: 'Covid-19',
      color: '#FF9900',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should pass validation when synonyms is optional and not provided', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagItemDto, {
      name: 'Covid-19',
      color: '#FF9900',
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });
});

describe('BulkCreateTagsDto', () => {
  it('should pass validation with valid array of tags', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagsDto, {
      tags: [
        {
          name: 'Covid-19',
          color: '#FF9900',
          category: 'HEALTH',
        },
        {
          name: 'Vaccination',
          color: '#00FF00',
          category: 'HEALTH',
        },
      ],
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should fail validation when tags array is empty', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagsDto, {
      tags: [],
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tags');
    expect(errors[0].constraints).toHaveProperty('arrayMinSize');
  });

  it('should fail validation when tags array exceeds 100 items', async () => {
    // Arrange
    const tags = Array.from({ length: 101 }, (_, i) => ({
      name: `Tag ${i}`,
      color: '#FF9900',
    }));
    const dto = plainToInstance(BulkCreateTagsDto, {
      tags,
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tags');
    expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
  });

  it('should fail validation when a tag in array has invalid data', async () => {
    // Arrange
    const dto = plainToInstance(BulkCreateTagsDto, {
      tags: [
        {
          name: 'Covid-19',
          color: '#FF9900',
        },
        {
          name: '', // Invalid: empty name
          color: '#00FF00',
        },
      ],
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
  });
});
