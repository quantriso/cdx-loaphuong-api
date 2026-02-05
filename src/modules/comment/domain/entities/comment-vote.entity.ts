import { AggregateRoot } from '@core/domain';
import { CommentVoteId } from '../value-objects/comment-vote-id.value-object';
import { CommentId } from '../value-objects/comment-id.value-object';
import { VoteType } from '../value-objects/vote-type.enum';
import { VoteCastedEvent } from '../events/vote-casted.event';
import { VoteRemovedEvent } from '../events/vote-removed.event';

/**
 * Comment Vote Aggregate Root
 * Represents a user's vote (like/dislike) on a comment
 *
 * Business Rules:
 * - A user can only vote once on a comment (like or dislike)
 * - Votes can be changed from like to dislike or vice versa
 * - Votes can be removed
 */
export class CommentVote extends AggregateRoot {
  private _id: CommentVoteId;
  private _commentId: CommentId;
  private _userId: string;
  private _voteType: VoteType;
  private _votedAt: Date;

  private constructor(
    id: CommentVoteId,
    commentId: CommentId,
    userId: string,
    voteType: VoteType,
  ) {
    super(id.value, 1, new Date(), new Date());
    this._id = id;
    this._commentId = commentId;
    this._userId = userId;
    this._voteType = voteType;
    this._votedAt = new Date();
  }

  /**
   * Create a new vote
   */
  static create(
    commentId: CommentId,
    userId: string,
    voteType: VoteType,
  ): CommentVote {
    const vote = new CommentVote(
      CommentVoteId.generate(),
      commentId,
      userId,
      voteType,
    );

    vote.addDomainEvent(
      new VoteCastedEvent(vote.getId(), {
        voteId: vote.getId(),
        commentId: commentId.value,
        userId,
        voteType,
      }),
    );

    return vote;
  }

  /**
   * Reconstruct vote from persistence
   */
  static reconstitute(
    id: CommentVoteId,
    commentId: CommentId,
    userId: string,
    voteType: VoteType,
    votedAt: Date,
  ): CommentVote {
    const vote = new CommentVote(id, commentId, userId, voteType);
    vote._votedAt = votedAt;
    return vote;
  }

  /**
   * Change vote type (e.g., from like to dislike)
   */
  changeVoteType(newVoteType: VoteType): void {
    if (this._voteType === newVoteType) {
      return; // No change needed
    }

    const oldVoteType = this._voteType;
    this._voteType = newVoteType;

    this.addDomainEvent(
      new VoteRemovedEvent(this.getId(), {
        voteId: this.getId(),
        commentId: this._commentId.value,
        userId: this._userId,
        voteType: oldVoteType,
      }),
    );

    this.addDomainEvent(
      new VoteCastedEvent(this.getId(), {
        voteId: this.getId(),
        commentId: this._commentId.value,
        userId: this._userId,
        voteType: newVoteType,
      }),
    );
  }

  /**
   * Remove vote
   */
  removeVote(): void {
    this.addDomainEvent(
      new VoteRemovedEvent(this.getId(), {
        voteId: this.getId(),
        commentId: this._commentId.value,
        userId: this._userId,
        voteType: this._voteType,
      }),
    );
  }

  // Getters

  getId(): string {
    return this._id.value;
  }

  get commentId(): CommentId {
    return this._commentId;
  }

  getCommentId(): string {
    return this._commentId.value;
  }

  get userId(): string {
    return this._userId;
  }

  get voteType(): VoteType {
    return this._voteType;
  }

  get votedAt(): Date {
    return this._votedAt;
  }

  protected get equalityComponents(): unknown[] {
    return [this._id];
  }
}
