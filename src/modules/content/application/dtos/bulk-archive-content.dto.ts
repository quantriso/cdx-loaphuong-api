import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContentOperationItemDto,
  BulkContentOperationsOptionsDto,
} from './bulk-content-operations.dto';

/**
 * DTO for bulk archive content request
 *
 * Story 3.8: Bulk Archive Content
 *
 * Allows archiving multiple published contents in a single request.
 * Supports partial success mode and batch tracking.
 */
export class BulkArchiveContentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one content is required' })
  @ArrayMaxSize(100, {
    message: 'Cannot process more than 100 contents at once',
  })
  @ValidateNested({ each: true })
  @Type(() => ContentOperationItemDto)
  items: ContentOperationItemDto[];

  @IsString()
  @IsNotEmpty({ message: 'Admin ID is required' })
  adminId: string;

  @IsString()
  @IsNotEmpty({ message: 'Tenant ID is required' })
  tenantId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BulkContentOperationsOptionsDto)
  options?: BulkContentOperationsOptionsDto;
}
