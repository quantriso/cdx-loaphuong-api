import { randomUUID } from "crypto";
import { Injectable, Inject } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateContentCommand } from "../create-content.command";
import { Content } from "../../../domain/entities";
import { ContentType, ContentPriority } from "../../../domain/value-objects";
import type { IContentRepository } from "../../../domain/repositories";
import { CONTENT_REPOSITORY_TOKEN } from "../../../constants/tokens";

/**
 * Create Content Command Handler
 *
 * Story 3.1: Create Content Draft
 * Handles creation of new content in DRAFT status
 */
@CommandHandler(CreateContentCommand)
@Injectable()
export class CreateContentHandler implements ICommandHandler<CreateContentCommand, string> {
  constructor(
    @Inject(CONTENT_REPOSITORY_TOKEN)
    private readonly contentRepository: IContentRepository
  ) {}

  async execute(command: CreateContentCommand): Promise<string> {
    // Generate new ID
    const contentId = randomUUID();

    // Create Content aggregate
    const content = Content.create({
      id: contentId,
      tenantId: command.tenantId,
      authorId: command.authorId,
      title: command.title,
      content: command.content,
      excerpt: command.excerpt,
      type: ContentType.fromValue(command.type),
      priority: command.priority
        ? ContentPriority.fromValue(command.priority)
        : ContentPriority.medium(),
      categoryId: command.categoryId,
      tags: command.tags,
      featuredImage: command.featuredImage,
    });

    // Save aggregate (will publish ContentCreatedEvent)
    await this.contentRepository.save(content);

    return contentId;
  }
}
