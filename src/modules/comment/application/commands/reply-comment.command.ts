import { ICommand } from '@core/application';

export class ReplyCommentCommand implements ICommand {
  constructor(
    public readonly parentCommentId: string,
    public readonly authorId: string,
    public readonly content: string,
    public readonly tenantId: string,
    public readonly mentions?: string[],
  ) {}
}
