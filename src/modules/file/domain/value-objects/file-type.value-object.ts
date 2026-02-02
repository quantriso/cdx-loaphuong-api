import { BaseValueObject } from '@core/domain';

export enum FileTypeEnum {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER',
}

export class FileType extends BaseValueObject {
  constructor(public readonly value: FileTypeEnum) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!Object.values(FileTypeEnum).includes(this.value)) {
      throw new Error(`Invalid file type: ${this.value}`);
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  static fromMimeType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return new FileType(FileTypeEnum.IMAGE);
    }
    if (mimeType.startsWith('video/')) {
      return new FileType(FileTypeEnum.VIDEO);
    }
    if (mimeType.startsWith('audio/')) {
      return new FileType(FileTypeEnum.AUDIO);
    }
    if (
      mimeType === 'application/pdf' ||
      mimeType === 'application/msword' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return new FileType(FileTypeEnum.DOCUMENT);
    }
    if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/x-7z-compressed' ||
      mimeType === 'application/x-tar' ||
      mimeType === 'application/gzip'
    ) {
      return new FileType(FileTypeEnum.ARCHIVE);
    }
    return new FileType(FileTypeEnum.OTHER);
  }

  static fromValue(value: FileTypeEnum): FileType {
    return new FileType(value);
  }

  toString(): string {
    return this.value;
  }

  isImage(): boolean {
    return this.value === FileTypeEnum.IMAGE;
  }

  isDocument(): boolean {
    return this.value === FileTypeEnum.DOCUMENT;
  }

  isVideo(): boolean {
    return this.value === FileTypeEnum.VIDEO;
  }

  isAudio(): boolean {
    return this.value === FileTypeEnum.AUDIO;
  }

  isArchive(): boolean {
    return this.value === FileTypeEnum.ARCHIVE;
  }

  isOther(): boolean {
    return this.value === FileTypeEnum.OTHER;
  }
}
