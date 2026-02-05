import { ICommand } from '@core/application';

/**
 * Command to remove a user's vote from a comment
 */
export class RemoveVoteCommand implements ICommand {
  constructor(
    public readonly commentId: string,
    public readonly userId: string,
  ) {}
}
