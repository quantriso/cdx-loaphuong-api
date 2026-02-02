import { randomUUID } from 'crypto';
import { BaseValueObject } from '@core/domain';

export class FileId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('File ID cannot be empty');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  static generate(): FileId {
    return new FileId(randomUUID());
  }
}
