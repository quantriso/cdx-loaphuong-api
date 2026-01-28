import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

/**
 * Create Category DTO
 *
 * Story 4.1: Manage Categories
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category value (unique key)',
    example: 'EMERGENCY',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  value: string;

  @ApiProperty({ description: 'Category label', example: 'Emergency Alerts' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiProperty({ description: 'Category description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Color code',
    example: '#FF0000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiProperty({ description: 'Icon', example: '🚨', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiProperty({ description: 'Sort order', example: 1 })
  @IsNumber()
  @Min(0)
  sortOrder: number;

  @ApiProperty({
    description: 'Parent category ID',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
