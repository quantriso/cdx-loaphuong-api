import { ApiProperty } from '@nestjs/swagger';

/**
 * Content History Entry DTO
 *
 * Story 3.9: View Content History
 *
 * Represents a single history entry in the content timeline.
 */
export class ContentHistoryEntryDto {
  @ApiProperty({ description: 'History entry ID' })
  id: string;

  @ApiProperty({ description: 'Content ID' })
  contentId: string;

  @ApiProperty({ description: 'Field that was changed' })
  field: string;

  @ApiProperty({ description: 'Previous value', required: false })
  oldValue?: any;

  @ApiProperty({ description: 'New value', required: false })
  newValue?: any;

  @ApiProperty({ description: 'User who made the change' })
  userId: string;

  @ApiProperty({ description: 'When the change was made' })
  timestamp: Date;
}

/**
 * Get Content History Response DTO
 *
 * Story 3.9: View Content History
 *
 * Returns paginated history of content changes.
 */
export class GetContentHistoryResponseDto {
  @ApiProperty({ description: 'Content ID' })
  contentId: string;

  @ApiProperty({ description: 'History entries', type: [ContentHistoryEntryDto] })
  entries: ContentHistoryEntryDto[];

  @ApiProperty({ description: 'Total number of history entries' })
  total: number;
}
