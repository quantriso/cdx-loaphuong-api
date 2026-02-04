import { ICommand } from '@core/application';

export class CreateCommentCommand implements ICommand {
  constructor(
    public readonly contentId: string,
    public readonly authorId: string,
    public readonly content: string,
    public readonly tenantId: string,
    public readonly parentCommentId?: string,
    public readonly mentions?: string[],
  ) {}
}
