import type { PaginatedResult, PaginationParams } from '../../../shared/domain/Pagination.js';
import type { Upload } from '../entities/Upload.js';
import type { UploadStatusValue } from '../value-objects/UploadStatus.js';

export type UploadStatusCounts = Record<UploadStatusValue, number>;

export interface IUploadRepository {
  /** Insert or update by id. */
  save(upload: Upload): Promise<void>;
  findById(id: string): Promise<Upload | null>;
  /** Ordered by createdAt desc. */
  findByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Upload>>;
  /** Every status present with 0 when absent. */
  countByStatus(userId: string): Promise<UploadStatusCounts>;
}
