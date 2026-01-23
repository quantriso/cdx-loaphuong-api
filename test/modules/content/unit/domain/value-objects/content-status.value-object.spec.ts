import { ContentStatus, ContentStatusEnum } from '../../../../../../src/modules/content/domain/value-objects';
import { DomainException } from '@core/domain';

describe('ContentStatus Value Object', () => {
  describe('Factory Methods', () => {
    it('should create DRAFT status', () => {
      const status = ContentStatus.draft();
      expect(status.toString()).toBe('DRAFT');
      expect(status.isDraft()).toBe(true);
    });

    it('should create PENDING status', () => {
      const status = ContentStatus.pending();
      expect(status.toString()).toBe('PENDING');
      expect(status.isPending()).toBe(true);
    });

    it('should create APPROVED status', () => {
      const status = ContentStatus.approved();
      expect(status.toString()).toBe('APPROVED');
      expect(status.isApproved()).toBe(true);
    });

    it('should create REJECTED status', () => {
      const status = ContentStatus.rejected();
      expect(status.toString()).toBe('REJECTED');
      expect(status.isRejected()).toBe(true);
    });

    it('should create PUBLISHED status', () => {
      const status = ContentStatus.published();
      expect(status.toString()).toBe('PUBLISHED');
      expect(status.isPublished()).toBe(true);
    });

    it('should create ARCHIVED status', () => {
      const status = ContentStatus.archived();
      expect(status.toString()).toBe('ARCHIVED');
      expect(status.isArchived()).toBe(true);
    });
  });

  describe('fromValue', () => {
    it('should create status from valid string value', () => {
      const status = ContentStatus.fromValue('DRAFT');
      expect(status.toString()).toBe('DRAFT');
    });

    it('should throw DomainException for invalid value', () => {
      expect(() => ContentStatus.fromValue('INVALID')).toThrow(DomainException);
      expect(() => ContentStatus.fromValue('INVALID')).toThrow('Invalid content status: INVALID');
    });
  });

  describe('State Transition Logic', () => {
    it('should allow DRAFT → PENDING transition', () => {
      const draft = ContentStatus.draft();
      const pending = ContentStatus.pending();

      expect(draft.canTransitionTo(pending)).toBe(true);
    });

    it('should allow PENDING → APPROVED transition', () => {
      const pending = ContentStatus.pending();
      const approved = ContentStatus.approved();

      expect(pending.canTransitionTo(approved)).toBe(true);
    });

    it('should allow PENDING → REJECTED transition', () => {
      const pending = ContentStatus.pending();
      const rejected = ContentStatus.rejected();

      expect(pending.canTransitionTo(rejected)).toBe(true);
    });

    it('should allow APPROVED → PUBLISHED transition', () => {
      const approved = ContentStatus.approved();
      const published = ContentStatus.published();

      expect(approved.canTransitionTo(published)).toBe(true);
    });

    it('should allow REJECTED → DRAFT transition', () => {
      const rejected = ContentStatus.rejected();
      const draft = ContentStatus.draft();

      expect(rejected.canTransitionTo(draft)).toBe(true);
    });

    it('should allow PUBLISHED → ARCHIVED transition', () => {
      const published = ContentStatus.published();
      const archived = ContentStatus.archived();

      expect(published.canTransitionTo(archived)).toBe(true);
    });

    it('should reject invalid DRAFT → APPROVED transition', () => {
      const draft = ContentStatus.draft();
      const approved = ContentStatus.approved();

      expect(draft.canTransitionTo(approved)).toBe(false);
    });

    it('should reject ARCHIVED → any transition', () => {
      const archived = ContentStatus.archived();
      const draft = ContentStatus.draft();

      expect(archived.canTransitionTo(draft)).toBe(false);
    });

    it('should transition with validation', () => {
      const draft = ContentStatus.draft();

      const pending = draft.transitionTo(ContentStatusEnum.PENDING);

      expect(pending.toString()).toBe('PENDING');
    });

    it('should throw DomainException on invalid transition', () => {
      const draft = ContentStatus.draft();

      expect(() => draft.transitionTo(ContentStatusEnum.APPROVED)).toThrow(DomainException);
      expect(() => draft.transitionTo(ContentStatusEnum.APPROVED)).toThrow(
        'Invalid status transition from DRAFT to APPROVED'
      );
    });
  });

  describe('Equality', () => {
    it('should be equal for same status values', () => {
      const status1 = ContentStatus.draft();
      const status2 = ContentStatus.draft();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal for different status values', () => {
      const draft = ContentStatus.draft();
      const pending = ContentStatus.pending();

      expect(draft.equals(pending)).toBe(false);
    });
  });
});
