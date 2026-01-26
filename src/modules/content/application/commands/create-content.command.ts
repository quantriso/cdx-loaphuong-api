import { ICommand } from '@core/application';

/**
 * Create Content Command
 *
 * Story 3.1: Create Content Draft
 * Command to create new content in DRAFT status
 */
export class CreateContentCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly authorId: string,
    public readonly title: string,
    public readonly content: string,
    public readonly type: string,
    public readonly excerpt?: string | null,
    public readonly priority?: string,
    public readonly categoryId?: string | null,
    public readonly tags?: string[],
    public readonly featuredImage?: string | null,
  ) {}
}
