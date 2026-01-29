import { ICommand } from 'src/libs/core/application';

export interface BulkCreateTagItemData {
  name: string;
  color: string;
  category?: string;
  synonyms?: string[];
}

export class BulkCreateTagsCommand implements ICommand {
  constructor(
    public readonly tags: BulkCreateTagItemData[],
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}
