import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Approve Content DTO
 *
 * Story 3.4: Approve Content
 * Used by Admin to approve PENDING content
 */
export class ApproveContentDto {
  @ApiProperty({
    description: 'Optional reason for approval',
    example: 'Content meets all quality standards',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Approval reason cannot exceed 500 characters',
  })
  reason?: string;
}
