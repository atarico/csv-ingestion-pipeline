import type { PaginatedResult, PaginationParams } from '../../domain/Pagination.js';
import type { Upload } from '../../../document-processing/domain/entities/Upload.js';
import type {
  IUploadRepository,
  UploadStatusCounts,
} from '../../../document-processing/domain/repositories/IUploadRepository.js';
import type { UploadStatusValue } from '../../../document-processing/domain/value-objects/UploadStatus.js';

export class InMemoryUploadRepository implements IUploadRepository {
  readonly uploads = new Map<string, Upload>();
  /** Appended on every save so tests can observe intermediate states. */
  readonly saveSnapshots: Array<{
    id: string;
    status: UploadStatusValue;
    processedRows: number | null;
    failedRows: number | null;
  }> = [];

  save(upload: Upload): Promise<void> {
    this.uploads.set(upload.id, upload);
    this.saveSnapshots.push({
      id: upload.id,
      status: upload.status.value,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
    });
    return Promise.resolve();
  }

  findById(id: string): Promise<Upload | null> {
    return Promise.resolve(this.uploads.get(id) ?? null);
  }

  findByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Upload>> {
    const owned = [...this.uploads.values()]
      .filter((upload) => upload.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
    const start = (pagination.page - 1) * pagination.limit;
    return Promise.resolve({
      items: owned.slice(start, start + pagination.limit),
      total: owned.length,
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  countByStatus(userId: string): Promise<UploadStatusCounts> {
    const counts: UploadStatusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    for (const upload of this.uploads.values()) {
      if (upload.userId === userId) counts[upload.status.value] += 1;
    }
    return Promise.resolve(counts);
  }
}
