import {
  AggregateRoot,
  DomainException,
  ISoftDeletable,
  IEventMetadata,
} from '@core/domain';
import { FileId } from '../value-objects/file-id.value-object';
import { FileType } from '../value-objects/file-type.value-object';
import { FileUploadedEvent } from '../events/file-uploaded.event';
import { FileProcessedEvent } from '../events/file-processed.event';
import { FileDeletedEvent } from '../events/file-deleted.event';

export interface FileProps {
  id: string;
  tenantId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileType: FileType;
  storagePath: string;
  storageProvider: string;
  processedPath?: string;
  thumbnailPath?: string;
  processedMetadata?: Record<string, any>;
  uploadedBy: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class File extends AggregateRoot implements ISoftDeletable {
  private _props: FileProps;
  private _deletedAt?: Date | null = null;

  private constructor(
    id: FileId,
    props: FileProps,
    version?: number,
    deletedAt?: Date | null,
  ) {
    super(
      id.value,
      version !== undefined ? version : props.version || 1,
      props.createdAt,
      props.updatedAt,
    );
    this._props = props;
    this._deletedAt = deletedAt;
  }

  static createNew(
    tenantId: string,
    originalFileName: string,
    mimeType: string,
    fileSize: number,
    fileType: FileType,
    storagePath: string,
    uploadedBy: string,
    storageProvider: string = 'local',
  ): File {
    File.validate({
      tenantId,
      originalFileName,
      mimeType,
      fileSize,
      fileType,
      storagePath,
      uploadedBy,
    });

    const id = FileId.generate();
    const now = new Date();

    const props: FileProps = {
      id: id.value,
      tenantId,
      originalFileName,
      mimeType,
      fileSize,
      fileType,
      storagePath,
      storageProvider,
      processedPath: undefined,
      thumbnailPath: undefined,
      processedMetadata: undefined,
      uploadedBy,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      version: 1, // New entities start with version 1
      createdAt: now,
      updatedAt: now,
    };

    const file = new File(id, props, 0, null); // Pass version 0 for new entities (triggers INSERT)
    file.addDomainEvent(
      new FileUploadedEvent(id.value, {
        tenantId,
        originalFileName,
        mimeType,
        fileSize,
        fileType: fileType.value,
        storagePath,
        uploadedBy,
      }),
    );

    return file;
  }

  static reconstitute(props: FileProps): File {
    return new File(
      new FileId(props.id),
      props,
      props.version,
      props.deletedAt,
    );
  }

  // --- Soft Delete Implementation (ISoftDeletable) ---

  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }

  /**
   * Soft delete the file
   * Emits FileDeletedEvent
   *
   * @param deletedBy - User ID who performed the deletion (optional)
   * @param metadata - Event metadata (optional)
   */
  public delete(deletedBy?: string, metadata?: IEventMetadata): void {
    if (this.isDeleted) return;

    this._deletedAt = new Date();
    this._props.isDeleted = true;
    this._props.deletedBy = deletedBy || null;
    this._props.updatedAt = new Date();

    this.addDomainEvent(
      new FileDeletedEvent(
        this.id,
        {
          tenantId: this.tenantId,
          originalFileName: this.originalFileName,
          storagePath: this.storagePath,
          deletedBy: this._props.deletedBy,
          deletedAt: this._deletedAt,
          isForceDelete: false,
        },
        metadata,
      ),
    );
  }

  /**
   * Restore a soft-deleted file
   */
  public restore(): void {
    if (!this.isDeleted) return;

    this._deletedAt = null;
    this._props.isDeleted = false;
    this._props.updatedAt = new Date();
  }

  // --- Business Behaviors ---

  markAsProcessed(
    processedPath: string,
    thumbnailPath?: string,
    metadata?: Record<string, any>,
  ): void {
    this.ensureNotDeleted();

    if (!this.fileType.isImage()) {
      throw new DomainException(
        'Only image files can be processed',
        'FILE_NOT_IMAGE',
      );
    }

    this._props.processedPath = processedPath;
    this._props.thumbnailPath = thumbnailPath;
    this._props.processedMetadata = metadata;
    this._props.updatedAt = new Date();
    this.incrementVersion();

    this.addDomainEvent(
      new FileProcessedEvent(this.id, {
        originalPath: this.storagePath,
        processedPath,
        thumbnailPath,
        metadata,
      }),
    );
  }

  forceDelete(deletedBy: string, reason?: string): void {
    this.ensureNotDeleted();

    this._deletedAt = new Date();
    this._props.isDeleted = true;
    this._props.deletedBy = deletedBy;
    this._props.updatedAt = new Date();
    this.incrementVersion();

    this.addDomainEvent(
      new FileDeletedEvent(this.id, {
        tenantId: this.tenantId,
        originalFileName: this.originalFileName,
        storagePath: this.storagePath,
        deletedBy: this._props.deletedBy,
        deletedAt: this._deletedAt,
        isForceDelete: true,
        forceDeleteReason: reason,
      }),
    );
  }

  /**
   * Check if file can be deleted (tenant validation)
   */
  canBeDeleted(tenantId: string): boolean {
    return this.tenantId === tenantId && !this.isDeleted;
  }

  private static validate({
    tenantId,
    originalFileName,
    mimeType,
    fileSize,
    fileType,
    storagePath,
    uploadedBy,
  }: Partial<FileProps>): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new DomainException('Tenant ID is required', 'TENANT_ID_REQUIRED');
    }

    if (!originalFileName || originalFileName.trim().length === 0) {
      throw new DomainException(
        'Original file name is required',
        'ORIGINAL_NAME_REQUIRED',
      );
    }

    if (!mimeType || mimeType.trim().length === 0) {
      throw new DomainException('MIME type is required', 'MIME_TYPE_REQUIRED');
    }

    if (fileSize === undefined || fileSize <= 0) {
      throw new DomainException(
        'File size must be positive',
        'INVALID_FILE_SIZE',
      );
    }

    if (!fileType) {
      throw new DomainException('File type is required', 'FILE_TYPE_REQUIRED');
    }

    if (!storagePath || storagePath.trim().length === 0) {
      throw new DomainException(
        'Storage path is required',
        'STORAGE_PATH_REQUIRED',
      );
    }

    if (!uploadedBy || uploadedBy.trim().length === 0) {
      throw new DomainException(
        'Uploaded by is required',
        'UPLOADED_BY_REQUIRED',
      );
    }
  }

  // Getters
  get tenantId(): string {
    return this._props.tenantId;
  }

  get originalFileName(): string {
    return this._props.originalFileName;
  }

  get mimeType(): string {
    return this._props.mimeType;
  }

  get fileSize(): number {
    return this._props.fileSize;
  }

  get fileType(): FileType {
    return this._props.fileType;
  }

  get storagePath(): string {
    return this._props.storagePath;
  }

  get storageProvider(): string {
    return this._props.storageProvider;
  }

  get processedPath(): string | undefined {
    return this._props.processedPath;
  }

  get thumbnailPath(): string | undefined {
    return this._props.thumbnailPath;
  }

  get processedMetadata(): Record<string, any> | undefined {
    return this._props.processedMetadata;
  }

  get uploadedBy(): string {
    return this._props.uploadedBy;
  }

  // Private helper methods
  private incrementVersion(): void {
    this._props.version = (this._props.version || 1) + 1;
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException('Cannot modify deleted file');
    }
  }

  get deletedBy(): string | null | undefined {
    return this._props.deletedBy;
  }
}
