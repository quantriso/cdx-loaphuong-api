import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  Length,
  Matches,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateTagItemDto {
  @ApiProperty({ description: 'Tag name', example: 'Covid-19' })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiProperty({ description: 'Tag color in hex format', example: '#FF9900' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #FF9900)',
  })
  color!: string;

  @ApiProperty({
    description: 'Category association',
    example: 'HEALTH',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Synonyms for search',
    example: ['coronavirus', 'sars-cov-2'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  synonyms?: string[];
}

export class BulkCreateTagsDto {
  @ApiProperty({
    description: 'Array of tags to create (minimum 1, maximum 100)',
    type: [BulkCreateTagItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one tag must be provided' })
  @ArrayMaxSize(100, { message: 'Maximum 100 tags allowed per bulk request' })
  @ValidateNested({ each: true })
  @Type(() => BulkCreateTagItemDto)
  tags!: BulkCreateTagItemDto[];
}
