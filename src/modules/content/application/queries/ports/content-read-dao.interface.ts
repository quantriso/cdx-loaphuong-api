import { ContentResponseDto } from '../../dtos';
import { PaginatedResponseDto } from 'src/libs/shared/http/dtos/pagination.dto';

/**
 * Content Read DAO Interface (Port)
 *
 * Following CQRS principles:
 * - Used ONLY by Query Handlers (never by Command Handlers)
 * - Returns DTOs (never domain entities)
 * - Optimized for read operations
 * - Can use denormalized data, views, or read replicas
 *
 * Location: application/queries/ports/ (following CQRS pattern)
 * Defined in Application Layer, implemented in Infrastructure.
 *
 * Tuân theo Dependency Inversion Principle:
 * - Application layer định nghĩa interface (Port)
 * - Infrastructure layer implement (Adapter)
 * - Application layer không phụ thuộc vào Infrastructure
 *
 * ## CQRS Note
 * This interface is for READ operations only.
 * Write operations go through IContentRepository (Write Side).
 */
export interface IContentReadDao {
  /**
   * Find content by ID for a specific tenant
   *
   * @param id Content ID
   * @param tenantId Tenant ID
   * @returns ContentResponseDto or null if not found
   */
  findById(id: string, tenantId: string): Promise<ContentResponseDto | null>;

  /**
   * Find content by author with optional status filter
   *
   * @param authorId Author ID
   * @param tenantId Tenant ID
   * @param status Optional status filter
   * @returns Array of ContentResponseDto
   */
  findByAuthor(
    authorId: string,
    tenantId: string,
    status?: string,
  ): Promise<ContentResponseDto[]>;

  /**
   * List contents with filtering, sorting, and pagination
   *
   * Story 4.5: Filter Content by Category & Tags
   *
   * @param tenantId Tenant ID
   * @param filters Filter parameters
   * @returns Paginated list of ContentResponseDto
   */
  listContents(
    tenantId: string,
    filters: {
      page: number;
      limit: number;
      category?: string;
      tags?: string[];
      dateFrom?: string;
      dateTo?: string;
      type?: string;
      authorId?: string;
      status?: string[];
      sortBy: string;
      sortOrder: string;
    },
  ): Promise<PaginatedResponseDto<ContentResponseDto>>;

  /**
   * Invalidate cache for a specific content
   *
   * @param id Content ID
   */
  invalidateCache(id: string): Promise<void>;

  /**
   * Invalidate cache for multiple contents
   *
   * @param ids Content IDs
   */
  invalidateCacheMany(ids: string[]): Promise<void>;
}
