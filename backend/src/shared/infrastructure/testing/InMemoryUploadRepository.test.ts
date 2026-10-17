import { beforeEach, describe, expect, it } from 'vitest';
import { Upload } from '../../../document-processing/domain/entities/Upload.js';
import { FileName } from '../../../document-processing/domain/value-objects/FileName.js';
import {
  UploadStatus,
  type UploadStatusValue,
} from '../../../document-processing/domain/value-objects/UploadStatus.js';
import { InMemoryUploadRepository } from './InMemoryUploadRepository.js';

const USER = 'user-123';
const PAGE = { page: 1, limit: 10 };

function buildUpload(
  status: UploadStatusValue,
  failedRows: number | null,
  userId = USER,
  createdAt = new Date(),
): Upload {
  const fileName = FileName.create('data.csv');
  if (fileName.isLeft()) throw fileName.value;
  const created = Upload.create({ fileName: fileName.value, userId });
  const parsedStatus = UploadStatus.fromValue(status);
  if (parsedStatus.isLeft()) throw parsedStatus.value;
  return Upload.reconstitute(created.id, {
    fileName: fileName.value,
    fileKey: created.fileKey,
    status: parsedStatus.value,
    userId,
    totalRows: null,
    processedRows: null,
    failedRows,
    errorMessage: null,
    errorCode: null,
    errorDetails: null,
    rowErrors: [],
    createdAt,
    updatedAt: createdAt,
  });
}

describe('InMemoryUploadRepository filters', () => {
  let repository: InMemoryUploadRepository;
  let clean: Upload;
  let withErrors: Upload;
  let unknownFailedRows: Upload;
  let failed: Upload;

  beforeEach(async () => {
    repository = new InMemoryUploadRepository();
    const base = Date.UTC(2026, 0, 1);
    clean = buildUpload('COMPLETED', 0, USER, new Date(base));
    withErrors = buildUpload('COMPLETED', 3, USER, new Date(base + 1000));
    unknownFailedRows = buildUpload('PROCESSING', null, USER, new Date(base + 2000));
    failed = buildUpload('FAILED', null, USER, new Date(base + 3000));
    for (const upload of [clean, withErrors, unknownFailedRows, failed]) {
      await repository.save(upload);
    }
    await repository.save(buildUpload('COMPLETED', 5, 'someone-else'));
  });

  it('filters by status', async () => {
    const result = await repository.findByUser(USER, PAGE, { status: 'COMPLETED' });

    expect(result.items.map((u) => u.id)).toEqual([withErrors.id, clean.id]);
    expect(result.total).toBe(2);
  });

  it('hasRowErrors=true keeps only uploads with failed rows', async () => {
    const result = await repository.findByUser(USER, PAGE, { hasRowErrors: true });

    expect(result.items.map((u) => u.id)).toEqual([withErrors.id]);
  });

  it('hasRowErrors=false keeps zero and unknown failed rows', async () => {
    const result = await repository.findByUser(USER, PAGE, { hasRowErrors: false });

    expect(result.items.map((u) => u.id)).toEqual([failed.id, unknownFailedRows.id, clean.id]);
  });

  it('combines the filters and reports the filtered total', async () => {
    const result = await repository.findByUser(
      USER,
      { page: 1, limit: 1 },
      { status: 'COMPLETED', hasRowErrors: false },
    );

    expect(result.items.map((u) => u.id)).toEqual([clean.id]);
    expect(result.total).toBe(1);
  });

  it('counts completed uploads with row errors for the user', async () => {
    expect(await repository.countCompletedWithRowErrors(USER)).toBe(1);
    expect(await repository.countCompletedWithRowErrors('nobody')).toBe(0);
  });
});
