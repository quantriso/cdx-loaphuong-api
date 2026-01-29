import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
  MinLength,
  IsEnum,
  IsArray,
  IsObject,
  ArrayMaxSize,
} from 'class-validator';
import { TagCategory } from '../../domain';

/**
 * Update Tag DTO
 *
 * Story 4.3: Create, Edit, Delete Tags
 */
export class UpdateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'Emergency',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Tag category',
    enum: TagCategory,
    example: TagCategory.EMERGENCY,
    required: false,
  })
  @IsOptional()
  @IsEnum(TagCategory, {
    message: `Category must be one of: ${Object.values(TagCategory).join(', ')}`,
  })
  category?: TagCategory;

  @ApiProperty({
    description: 'Tag description',
    example: 'Critical emergency notifications',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Hex color code',
    example: '#FF0000',
    pattern: '^#[0-9A-Fa-f]{6}$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex code (e.g., #FF0000)',
  })
  color?: string;

  @ApiProperty({
    description: 'Alternative names/keywords for the tag',
    example: ['urgent', 'critical', 'alert'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  @ArrayMaxSize(50)
  synonyms?: string[];

  @ApiProperty({
    description: 'Active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Extensible metadata (JSON object)',
    example: { priority: 'high', alertSound: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
