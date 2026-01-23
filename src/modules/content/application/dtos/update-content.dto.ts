import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
} from "class-validator";

/**
 * Update Content DTO
 *
 * Story 3.2: Update Content
 *
 * Validation Rules:
 * - All fields are optional (partial update)
 * - Title must be non-empty string if provided
 * - Content must be non-empty string if provided
 * - CategoryId must be valid UUID if provided
 * - Tags must be array of strings if provided
 */
export class UpdateContentDto {
  @ApiProperty({
    description: "Content title",
    example: "Introduction to DDD",
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: "Content body (supports rich text)",
    example: "Domain-Driven Design is a software development approach...",
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: "Brief excerpt of the content",
    example: "Learn the fundamentals of DDD",
    required: false,
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    description: "Category ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: "Featured image URL",
    example: "https://example.com/images/ddd-cover.jpg",
    required: false,
  })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({
    description: "Content tags",
    example: ["ddd", "architecture", "design"],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
