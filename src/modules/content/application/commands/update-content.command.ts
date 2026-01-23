import { ICommand } from "@core/application";

/**
 * Update Content Command
 *
 * Story 3.2: Update Content
 *
 * Allows editors to update content fields while in DRAFT status.
 * Also allows editing REJECTED content, which resets it to DRAFT.
 *
 * All content fields are optional - only provided fields will be updated.
 */
export class UpdateContentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly title?: string,
    public readonly content?: string,
    public readonly excerpt?: string | null,
    public readonly categoryId?: string | null,
    public readonly featuredImage?: string | null,
    public readonly tags?: string[]
  ) {}
}
