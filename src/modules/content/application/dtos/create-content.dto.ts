import { IsString, IsEnum, IsOptional, MaxLength, IsArray, IsUUID } from "class-validator";
import { ContentTypeEnum, ContentPriorityEnum } from "../../domain/value-objects";

/**
 * Create Content DTO
 *
 * Story 3.1: Create Content Draft
 * Validates input for creating new content
 */
export class CreateContentDto {
  @IsString()
  @MaxLength(200, { message: "Title cannot exceed 200 characters" })
  title!: string;

  @IsString()
  @MaxLength(10000, { message: "Content cannot exceed 10000 characters" })
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Excerpt cannot exceed 500 characters" })
  excerpt?: string;

  @IsEnum(ContentTypeEnum)
  type!: ContentTypeEnum;

  @IsOptional()
  @IsEnum(ContentPriorityEnum)
  priority?: ContentPriorityEnum;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  featuredImage?: string;
}
