import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO for a single content operation item
 *
 * Shared by both bulk publish and bulk archive operations.
 * Story 3.8: Bulk Operations
 */
export class ContentOperationItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Content ID is required' })
  contentId: string;

  @IsOptional()
  @IsString()
  reason?: string; // Optional reason for audit trail
}

/**
 * Options for bulk content operations
 *
 * Shared by both bulk publish and bulk archive operations.
 * Story 3.8: Bulk Operations
 */
export class BulkContentOperationsOptionsDto {
  @IsOptional()
  @IsBoolean({ message: 'Allow partial success must be a boolean' })
  allowPartialSuccess?: boolean;

  @IsOptional()
  @IsString()
  batchReference?: string;
}
