import type { PaginatedResult, PaginationParams } from '../../../shared/domain/Pagination.js';
import type { Upload } from '../entities/Upload.js';
import type { UploadStatusValue } from '../value-objects/UploadStatus.js';

export type UploadStatusCounts = Record<UploadStatusValue, number>;

/** Optional narrowing of a user's uploads; omitted fields do not filter. */
export interface UploadListFilter {
  status?: UploadStatusValue;
  /** `true` keeps failedRows > 0; `false` keeps failedRows = 0 or unknown (null). */
  hasRowErrors?: boolean;
}

export interface IUploadRepository {
  /** Insert or update by id. */
  save(upload: Upload): Promise<void>;
  findById(id: string): Promise<Upload | null>;
  /** Ordered by createdAt desc; `total` counts the filtered set. */
  findByUser(
    userId: string,
    pagination: PaginationParams,
    filter?: UploadListFilter,
  ): Promise<PaginatedResult<Upload>>;
  /** Every status present with 0 when absent. */
  countByStatus(userId: string): Promise<UploadStatusCounts>;
  /** COMPLETED uploads whose failedRows > 0. */
  countCompletedWithRowErrors(userId: string): Promise<number>;
}
