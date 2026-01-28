import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsBoolean,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

/**
 * Update Category DTO
 *
 * Story 4.1: Manage Categories
 */
export class UpdateCategoryDto {
  @ApiProperty({ description: 'Category label', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @ApiProperty({ description: 'Category description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Color code', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiProperty({ description: 'Icon', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Sort order', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({
    description: 'Parent category ID',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
