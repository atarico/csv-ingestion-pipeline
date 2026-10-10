import type { PaginatedResult, PaginationParams } from '../../../shared/domain/Pagination.js';
import type { ActivityData } from '../entities/ActivityData.js';

export interface IActivityDataRepository {
  saveMany(rows: ActivityData[]): Promise<void>;
  deleteByUploadId(uploadId: string): Promise<void>;
  /** Ordered by rowNumber asc. */
  findByUploadId(
    uploadId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityData>>;
  countByUploadId(uploadId: string): Promise<number>;
}
