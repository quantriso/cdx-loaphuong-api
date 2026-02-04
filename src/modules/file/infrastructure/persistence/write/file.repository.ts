import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, or, gte, lte, isNull } from 'drizzle-orm';

// Import from Core (interfaces only)
import type { IEventBus } from '@core/infrastructure';
import { ConcurrencyException } from '@core/common';

// Import from Shared (implementations)
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from '@shared';

// Import Domain & Ports
import { File } from '../../../domain/entities/file.entity';
import { IFileRepository } from '../../../domain/repositories/file.repository.interface';
import { FileId } from '../../../domain/value-objects/file-id.value-object';

// Import Infrastructure (Schema & Config)
import { filesTable, type FileRecord } from '../drizzle/schema/file.schema';
import { FileType } from '../../../domain/value-objects/file-type.value-object';

/**
 * File Repository Implementation (Adapter) - WRITE SIDE ONLY
 *
 * Implements IFileRepository interface using Drizzle ORM.
 * Extends BaseAggregateRepository for automatic domain event publishing.
 *
 * ## CQRS Note
 *
 * This repository is for WRITE operations only:
 * - save() - Persist aggregate with events
 * - getById() - Load aggregate for modification
 * - delete() - Remove aggregate
 * - existsByStoragePath() - Support uniqueness validation
 *
 * For READ operations (queries, search, statistics), use FileReadDao.
 *
 * ## Event Publishing Strategy
 *
 * - With OutboxRepository: Uses Transactional Outbox Pattern (recommended)
 * - Without OutboxRepository: Uses direct event publishing (simpler but less reliable)
 *
 * ## Transactional Outbox Pattern
 *
 * When enabled, events are stored in the same transaction as the aggregate.
 * A separate worker (OutboxProcessor) polls and publishes events.
 * This guarantees at-least-once delivery even if the application crashes.
 */
@Injectable()
export class FileRepository
  extends BaseAggregateRepository<File>
  implements IFileRepository
{
  private readonly logger = new Logger(FileRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
  ) {
    // BaseAggregateRepository only accepts eventBus in constructor
    super(eventBus);
  }

  /**
   * Persist aggregate to database with Optimistic Concurrency Control
   */
  protected async persist(
    aggregate: File,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    console.log('[REPOSITORY persist] Starting persist operation');
    console.log(
      '[REPOSITORY persist] Using transaction:',
      !!options?.transaction,
    );
    console.log('[REPOSITORY persist] expectedVersion:', expectedVersion);
    console.log('[REPOSITORY persist] aggregate.version:', aggregate.version);

    if (expectedVersion === 0) {
      // INSERT for new aggregate
      try {
        console.log('[REPOSITORY persist] About to INSERT with values:', {
          id: persistenceModel.id,
          tenantId: persistenceModel.tenantId,
          originalFileName: persistenceModel.originalFileName,
          version: persistenceModel.version,
        });
        await db.insert(filesTable).values(persistenceModel);
        console.log('[REPOSITORY persist] INSERT completed successfully');

        // Verify the insert worked by querying immediately
        // Use the same db connection that was used for INSERT
        const verifyResult = await db
          .select({ id: filesTable.id })
          .from(filesTable)
          .where(eq(filesTable.id, persistenceModel.id))
          .limit(1);
        console.log(
          '[REPOSITORY persist] Verification query result count:',
          verifyResult.length,
        );
      } catch (error) {
        console.error('[REPOSITORY ERROR] INSERT failed:');
        console.error('  id:', persistenceModel.id);
        console.error('  tenantId:', persistenceModel.tenantId);
        console.error('  originalFileName:', persistenceModel.originalFileName);
        console.error('  mimeType:', persistenceModel.mimeType);
        console.error(
          '  fileSize (BigInt):',
          persistenceModel.fileSize.toString(),
        );
        console.error('  fileType:', persistenceModel.fileType);
        console.error('  storagePath:', persistenceModel.storagePath);
        console.error('  storageProvider:', persistenceModel.storageProvider);
        console.error('  processedPath:', persistenceModel.processedPath);
        console.error('  thumbnailPath:', persistenceModel.thumbnailPath);
        console.error('  uploadedBy:', persistenceModel.uploadedBy);
        console.error('  deletedAt:', persistenceModel.deletedAt);
        console.error('  version:', persistenceModel.version);
        console.error('  createdAt:', persistenceModel.createdAt);
        console.error('  updatedAt:', persistenceModel.updatedAt);
        console.error('[REPOSITORY ERROR] Full error:', error);
        throw error;
      }
    } else {
      // UPDATE with version check (OCC)
      const result = await db
        .update(filesTable)
        .set(persistenceModel)
        .where(
          and(
            eq(filesTable.id, aggregate.id),
            eq(filesTable.version, expectedVersion),
          ),
        )
        .returning({ id: filesTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  /**
   * Get aggregate by ID for modification
   */
  async getById(id: string): Promise<File | null> {
    console.log('[REPOSITORY getById] Querying file with id:', id);
    const result = await this.db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.id, id), isNull(filesTable.deletedAt)))
      .limit(1);

    console.log('[REPOSITORY getById] Query result count:', result.length);
    if (result.length === 0) {
      console.log('[REPOSITORY getById] File not found');
      return null;
    }

    console.log('[REPOSITORY getById] File found, returning entity');
    return this.toDomain(result[0]);
  }

  /**
   * Find file by ID (implements IFileRepository interface)
   */
  async findById(id: FileId): Promise<File | null> {
    return this.getById(id.value);
  }

  /**
   * Delete aggregate (hard delete)
   *
   * Note: For soft delete, use file.softDelete() method instead.
   */
  async delete(id: string | FileId): Promise<void> {
    const idString = id instanceof FileId ? id.value : id;
    await this.db.delete(filesTable).where(eq(filesTable.id, idString));
  }

  /**
   * Check if storage path exists (for uniqueness validation)
   *
   * More efficient than loading the full aggregate when you only need existence check.
   */
  async existsByStoragePath(storagePath: string): Promise<boolean> {
    const result = await this.db
      .select({ id: filesTable.id })
      .from(filesTable)
      .where(eq(filesTable.storagePath, storagePath))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find file by storage key (implements IFileRepository interface)
   */
  async findByStorageKey(storageKey: string): Promise<File | null> {
    const result = await this.db
      .select()
      .from(filesTable)
      .where(eq(filesTable.storagePath, storageKey))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  /**
   * Find all files by tenant ID (implements IFileRepository interface)
   */
  async findAllByTenantId(tenantId: string): Promise<File[]> {
    const results = await this.db
      .select()
      .from(filesTable)
      .where(eq(filesTable.tenantId, tenantId))
      .orderBy(desc(filesTable.createdAt));

    return results.map((row) => this.toDomain(row));
  }

  /**
   * Check if file exists by ID (implements IFileRepository interface)
   */
  async exists(id: FileId): Promise<boolean> {
    const result = await this.db
      .select({ id: filesTable.id })
      .from(filesTable)
      .where(eq(filesTable.id, id.value))
      .limit(1);

    return result.length > 0;
  }

  /**
   * List files with filtering and pagination
   */
  async list(options: {
    tenantId: string;
    page: number;
    limit: number;
    fileType?: string;
    uploadedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ files: File[]; total: number }> {
    console.log(
      '[REPOSITORY list] Starting list operation with options:',
      options,
    );

    const {
      tenantId,
      page,
      limit,
      fileType,
      uploadedBy,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = options;

    // Build conditions
    const conditions = [eq(filesTable.tenantId, tenantId)];

    if (fileType) {
      conditions.push(eq(filesTable.fileType, fileType));
    }

    if (uploadedBy) {
      conditions.push(eq(filesTable.uploadedBy, uploadedBy));
    }

    if (dateFrom || dateTo) {
      const dateConditions: any[] = [];
      if (dateFrom) {
        dateConditions.push(gte(filesTable.createdAt, dateFrom));
      }
      if (dateTo) {
        dateConditions.push(lte(filesTable.createdAt, dateTo));
      }
      if (dateConditions.length === 1) {
        conditions.push(dateConditions[0]);
      } else if (dateConditions.length > 1) {
        const orCondition = or(...dateConditions);
        if (orCondition) {
          conditions.push(orCondition);
        }
      }
    }

    // Get total count
    const countResult = await this.db
      .select({ count: filesTable.id })
      .from(filesTable)
      .where(and(...conditions));

    const total = countResult.length;

    console.log('[REPOSITORY list] Number of conditions:', conditions.length);

    // Get paginated results with sorting
    const results = await this.db
      .select()
      .from(filesTable)
      .where(and(...conditions))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(
        sortOrder === 'desc'
          ? desc(filesTable.createdAt)
          : filesTable.createdAt,
      );

    console.log('[REPOSITORY list] Query result count:', results.length);
    console.log('[REPOSITORY list] Total count:', total);

    return {
      files: results.map((row) => this.toDomain(row)),
      total,
    };
  }

  // --- Mapping Methods ---

  /**
   * Map Domain Entity to Persistence Model
   */
  private toPersistence(aggregate: File): FileRecord {
    return {
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      originalFileName: aggregate.originalFileName,
      mimeType: aggregate.mimeType,
      fileSize: BigInt(aggregate.fileSize),
      fileType: aggregate.fileType.toString(),
      storagePath: aggregate.storagePath,
      storageProvider: aggregate.storageProvider,
      processedPath: aggregate.processedPath || null,
      thumbnailPath: aggregate.thumbnailPath || null,
      processedMetadata: aggregate.processedMetadata || null,
      uploadedBy: aggregate.uploadedBy,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt || null,
      deletedBy: aggregate.deletedBy || null,
      version: aggregate.version,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  /**
   * Map Persistence Model to Domain Entity
   */
  private toDomain(row: FileRecord): File {
    return File.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      fileSize: Number(row.fileSize),
      fileType: FileType.fromValue(row.fileType as any),
      storagePath: row.storagePath,
      storageProvider: row.storageProvider,
      processedPath: row.processedPath || undefined,
      thumbnailPath: row.thumbnailPath || undefined,
      processedMetadata: row.processedMetadata || undefined,
      uploadedBy: row.uploadedBy,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
