import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * Reject Content DTO
 *
 * Story 3.5: Reject Content with Feedback
 * Used by Admin to reject PENDING content with feedback for author
 */
export class RejectContentDto {
  @ApiProperty({
    description: 'Required reason for rejection (feedback for author)',
    example:
      'Please improve the introduction section and add more supporting examples',
    minLength: 10,
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  @MinLength(10, {
    message: 'Rejection reason must be at least 10 characters',
  })
  @MaxLength(1000, {
    message: 'Rejection reason cannot exceed 1000 characters',
  })
  reason: string;
}
