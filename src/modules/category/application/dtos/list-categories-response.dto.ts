import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto';

/**
 * List Categories Response DTO
 *
 * Story 4.1: Manage Categories
 */
export class ListCategoriesResponseDto {
  @ApiProperty({ description: 'Categories', type: [CategoryResponseDto] })
  data: CategoryResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}
