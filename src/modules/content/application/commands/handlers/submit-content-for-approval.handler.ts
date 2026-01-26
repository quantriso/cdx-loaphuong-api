import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { ICommandHandler } from '@core/application';
import { SubmitContentForApprovalCommand } from '../submit-content-for-approval.command';
import type { IContentRepository } from '../../../domain/repositories';
import {
  CONTENT_REPOSITORY_TOKEN,
  CONTENT_READ_DAO_TOKEN,
} from '../../../constants';
import type { IContentReadDao } from '../../queries/ports';

/**
 * Submit Content for Approval Command Handler
 *
 * Story 3.3: Submit Content for Approval
 *
 * Business Rules:
 * - Only DRAFT content can be submitted for approval
 * - Only content author can submit (tenant isolation enforced)
 * - Status transitions from DRAFT to PENDING
 * - Emits ContentSubmittedForApprovalEvent
 *
 * Implementation:
 * 1. Fetch content by ID with tenant verification
 * 2. Verify content is in DRAFT status
 * 3. Verify user is the author (security check)
 * 4. Submit for approval (triggers status transition)
 * 5. Save to repository (emits event)
 * 6. Invalidate read cache
 */
@CommandHandler(SubmitContentForApprovalCommand)
@Injectable()
export class SubmitContentForApprovalHandler implements ICommandHandler<
  SubmitContentForApprovalCommand,
  void
> {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository,
    @Inject(CONTENT_READ_DAO_TOKEN)
    private readonly contentReadDao: IContentReadDao,
  ) {}

  async execute(command: SubmitContentForApprovalCommand): Promise<void> {
    // 1. Fetch content with tenant verification
    const content = await this.contentRepository.getById(command.contentId);

    if (!content) {
      throw new NotFoundException(
        `Content with id ${command.contentId} not found`,
      );
    }

    // 2. Verify tenant ownership (security: prevent cross-tenant access)
    if (content.tenantId !== command.tenantId) {
      throw new NotFoundException(
        `Content with id ${command.contentId} not found`,
      );
    }

    // 3. Verify user is author
    // Note: Admin override can be added later if needed via userRole check
    if (content.authorId !== command.userId) {
      throw new BadRequestException(
        'Only content author can submit content for approval',
      );
    }

    // 4. Submit for approval (domain method handles validation and event)
    // Will throw DomainException if not in DRAFT status
    content.submitForApproval({
      userId: command.userId,
    });

    // 5. Save to repository (publishes event via Outbox pattern)
    await this.contentRepository.save(content);

    // 6. Invalidate read cache
    await this.contentReadDao.invalidateCache(content.id);
  }
}
