import type { PaginatedResult, PaginationParams } from '../../domain/Pagination.js';
import type { ActivityData } from '../../../document-processing/domain/entities/ActivityData.js';
import type { IActivityDataRepository } from '../../../document-processing/domain/repositories/IActivityDataRepository.js';

export class InMemoryActivityDataRepository implements IActivityDataRepository {
  readonly rows: ActivityData[] = [];

  saveMany(rows: ActivityData[]): Promise<void> {
    this.rows.push(...rows);
    return Promise.resolve();
  }

  deleteByUploadId(uploadId: string): Promise<void> {
    const kept = this.rows.filter((row) => row.uploadId !== uploadId);
    this.rows.length = 0;
    this.rows.push(...kept);
    return Promise.resolve();
  }

  findByUploadId(
    uploadId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityData>> {
    const matching = this.rows
      .filter((row) => row.uploadId === uploadId)
      .sort((a, b) => a.rowNumber - b.rowNumber);
    const start = (pagination.page - 1) * pagination.limit;
    return Promise.resolve({
      items: matching.slice(start, start + pagination.limit),
      total: matching.length,
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  countByUploadId(uploadId: string): Promise<number> {
    return Promise.resolve(this.rows.filter((row) => row.uploadId === uploadId).length);
  }
}
