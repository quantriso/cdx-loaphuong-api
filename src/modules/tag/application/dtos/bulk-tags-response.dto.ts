import { ApiProperty } from '@nestjs/swagger';

export class BulkTagResultItemDto {
  @ApiProperty({ description: 'Tag name', example: 'Existing Tag' })
  name!: string;

  @ApiProperty({
    description: 'Reason for skip or failure',
    example: 'Tag already exists',
  })
  reason!: string;
}

export class BulkTagsResponseDto {
  @ApiProperty({ description: 'Number of tags created', example: 10 })
  created!: number;

  @ApiProperty({
    description: 'Number of tags skipped (duplicates)',
    example: 2,
  })
  skipped!: number;

  @ApiProperty({
    description: 'Number of tags failed (validation errors)',
    example: 0,
  })
  failed!: number;

  @ApiProperty({
    description: 'Details of skipped tags',
    type: [BulkTagResultItemDto],
    required: false,
  })
  skippedTags?: BulkTagResultItemDto[];

  @ApiProperty({
    description: 'Details of failed tags',
    type: [BulkTagResultItemDto],
    required: false,
  })
  failedTags?: BulkTagResultItemDto[];
}
