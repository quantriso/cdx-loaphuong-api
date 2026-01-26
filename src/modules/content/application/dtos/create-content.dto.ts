import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ContentTypeEnum,
  ContentPriorityEnum,
} from '../../domain/value-objects';

/**
 * Create Content DTO
 *
 * Story 3.1: Create Content Draft
 * Validates input for creating new content
 */
export class CreateContentDto {
  @ApiProperty({
    description: 'Content title',
    example: 'Introduction to Domain-Driven Design',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @ApiProperty({
    description: 'Content body (supports rich text)',
    example:
      'Domain-Driven Design is a software development approach that focuses on modeling the business domain...',
    maxLength: 10000,
  })
  @IsString()
  @MaxLength(10000, { message: 'Content cannot exceed 10000 characters' })
  content!: string;

  @ApiProperty({
    description: 'Brief excerpt of the content',
    example:
      'Learn the fundamentals of DDD and how to apply it to your projects',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Excerpt cannot exceed 500 characters' })
  excerpt?: string;

  @ApiProperty({
    description: 'Content type',
    enum: ContentTypeEnum,
    example: ContentTypeEnum.ARTICLE,
  })
  @IsEnum(ContentTypeEnum)
  type!: ContentTypeEnum;

  @ApiProperty({
    description: 'Content priority',
    enum: ContentPriorityEnum,
    example: ContentPriorityEnum.MEDIUM,
    required: false,
    default: ContentPriorityEnum.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ContentPriorityEnum)
  priority?: ContentPriorityEnum;

  @ApiProperty({
    description: 'Category ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Content tags for categorization and search',
    example: ['ddd', 'architecture', 'design-patterns'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Featured image URL',
    example: 'https://example.com/images/ddd-cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  featuredImage?: string;
}
