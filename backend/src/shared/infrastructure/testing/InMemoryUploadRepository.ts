import type { PaginatedResult, PaginationParams } from '../../domain/Pagination.js';
import { Upload } from '../../../document-processing/domain/entities/Upload.js';
import type {
  IUploadRepository,
  UploadStatusCounts,
} from '../../../document-processing/domain/repositories/IUploadRepository.js';
import type { UploadStatusValue } from '../../../document-processing/domain/value-objects/UploadStatus.js';

function copyOf(upload: Upload): Upload {
  return Upload.reconstitute(upload.id, upload.toProps());
}

export class InMemoryUploadRepository implements IUploadRepository {
  /** Holds private copies: callers never share an instance with the repository. */
  readonly uploads = new Map<string, Upload>();
  /** Appended on every save so tests can observe intermediate states. */
  readonly saveSnapshots: Array<{
    id: string;
    status: UploadStatusValue;
    processedRows: number | null;
    failedRows: number | null;
  }> = [];

  save(upload: Upload): Promise<void> {
    this.uploads.set(upload.id, copyOf(upload));
    this.saveSnapshots.push({
      id: upload.id,
      status: upload.status.value,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
    });
    return Promise.resolve();
  }

  findById(id: string): Promise<Upload | null> {
    const stored = this.uploads.get(id);
    return Promise.resolve(stored ? copyOf(stored) : null);
  }

  findByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Upload>> {
    const owned = [...this.uploads.values()]
      .filter((upload) => upload.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
    const start = (pagination.page - 1) * pagination.limit;
    return Promise.resolve({
      items: owned.slice(start, start + pagination.limit).map(copyOf),
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
