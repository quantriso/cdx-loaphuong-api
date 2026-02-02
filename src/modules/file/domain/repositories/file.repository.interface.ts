import { File } from '../entities/file.entity';
import { FileId } from '../value-objects/file-id.value-object';

export interface IFileRepository {
  save(file: File): Promise<File>;
  findById(id: FileId): Promise<File | null>;
  findByStorageKey(storageKey: string): Promise<File | null>;
  findAllByTenantId(tenantId: string): Promise<File[]>;
  delete(id: FileId): Promise<void>;
  exists(id: FileId): Promise<boolean>;
}
