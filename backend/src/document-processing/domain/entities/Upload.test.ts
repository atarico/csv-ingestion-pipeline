import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileName } from '../value-objects/FileName.js';
import { UploadStatus } from '../value-objects/UploadStatus.js';
import type { RowError } from './RowError.js';
import { Upload } from './Upload.js';

function newUpload(): Upload {
  const fileName = FileName.create('mi archivo.csv');
  if (fileName.isLeft()) throw new Error('fixture file name must be valid');
  return Upload.create({ fileName: fileName.value, userId: 'user-123' });
}

function processing(totalRows = 10): Upload {
  const upload = newUpload();
  upload.startProcessing(totalRows);
  return upload;
}

function errors(count: number): RowError[] {
  return Array.from({ length: count }, (_, i) => ({ row: i + 1, field: 'amount', message: 'bad' }));
}

describe('Upload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('create sets PENDING, fileKey and null counts', () => {
    const upload = newUpload();
    expect(upload.status).toBe(UploadStatus.PENDING);
    expect(upload.fileKey).toBe(`uploads/${upload.id}/mi_archivo.csv`);
    expect(upload.userId).toBe('user-123');
    expect(upload.fileName.value).toBe('mi archivo.csv');
    expect(upload.totalRows).toBeNull();
    expect(upload.processedRows).toBeNull();
    expect(upload.failedRows).toBeNull();
    expect(upload.errorMessage).toBeNull();
    expect(upload.rowErrors).toEqual([]);
    expect(upload.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(upload.updatedAt).toEqual(upload.createdAt);
  });

  it('startProcessing from PENDING sets PROCESSING and zero counts', () => {
    const upload = newUpload();
    const result = upload.startProcessing(10);
    expect(result.isRight()).toBe(true);
    expect(upload.status).toBe(UploadStatus.PROCESSING);
    expect(upload.totalRows).toBe(10);
    expect(upload.processedRows).toBe(0);
    expect(upload.failedRows).toBe(0);
  });

  it('startProcessing from PROCESSING resets previous progress and errors', () => {
    const upload = processing(10);
    upload.recordProgress(4, 2);
    expect(upload.startProcessing(20).isRight()).toBe(true);
    expect(upload.status).toBe(UploadStatus.PROCESSING);
    expect(upload.totalRows).toBe(20);
    expect(upload.processedRows).toBe(0);
    expect(upload.failedRows).toBe(0);
    expect(upload.rowErrors).toEqual([]);
    expect(upload.errorMessage).toBeNull();
  });

  it('startProcessing from COMPLETED/FAILED returns Left and leaves the aggregate unchanged', () => {
    const completed = processing();
    completed.complete({ processedRows: 5, failedRows: 0, rowErrors: [] });
    const failed = newUpload();
    failed.fail('bad header');
    for (const upload of [completed, failed]) {
      const before = upload.status;
      const result = upload.startProcessing(3);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.code).toBe('INVALID_STATE_TRANSITION');
      expect(upload.status).toBe(before);
    }
    expect(completed.totalRows).toBe(5);
  });

  it('startProcessing throws RangeError for negative or non-integer totals', () => {
    expect(() => newUpload().startProcessing(-1)).toThrow(RangeError);
    expect(() => newUpload().startProcessing(1.5)).toThrow(RangeError);
  });

  it('recordProgress only in PROCESSING', () => {
    const pending = newUpload();
    expect(pending.recordProgress(1, 0).isLeft()).toBe(true);
    expect(pending.processedRows).toBeNull();

    const running = processing();
    expect(running.recordProgress(3, 1).isRight()).toBe(true);
    expect(running.processedRows).toBe(3);
    expect(running.failedRows).toBe(1);
  });

  it('complete sets COMPLETED, totalRows and caps rowErrors to 100', () => {
    const upload = processing();
    const result = upload.complete({ processedRows: 40, failedRows: 150, rowErrors: errors(150) });
    expect(result.isRight()).toBe(true);
    expect(upload.status).toBe(UploadStatus.COMPLETED);
    expect(upload.processedRows).toBe(40);
    expect(upload.failedRows).toBe(150);
    expect(upload.totalRows).toBe(190);
    expect(upload.rowErrors).toHaveLength(100);
    expect(upload.errorMessage).toBeNull();
  });

  it('complete with zero processedRows returns Left ValidationError', () => {
    const upload = processing();
    const result = upload.complete({ processedRows: 0, failedRows: 3, rowErrors: [] });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe('VALIDATION_ERROR');
      expect(result.value.message).toBe('An upload cannot complete with zero valid rows');
    }
    expect(upload.status).toBe(UploadStatus.PROCESSING);
  });

  it('complete from PENDING returns Left', () => {
    const upload = newUpload();
    const result = upload.complete({ processedRows: 1, failedRows: 0, rowErrors: [] });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe('INVALID_STATE_TRANSITION');
    expect(upload.status).toBe(UploadStatus.PENDING);
  });

  it('fail from PENDING and PROCESSING sets FAILED with message', () => {
    for (const upload of [newUpload(), processing()]) {
      expect(upload.fail('Invalid header').isRight()).toBe(true);
      expect(upload.status).toBe(UploadStatus.FAILED);
      expect(upload.errorMessage).toBe('Invalid header');
    }
  });

  it('fail with counts stores processedRows, failedRows and capped rowErrors', () => {
    const upload = newUpload();
    const result = upload.fail('zero valid rows', {
      processedRows: 0,
      failedRows: 150,
      rowErrors: errors(150),
    });
    expect(result.isRight()).toBe(true);
    expect(upload.processedRows).toBe(0);
    expect(upload.failedRows).toBe(150);
    expect(upload.rowErrors).toHaveLength(100);
    expect(upload.totalRows).toBe(150);
  });

  it('fail with counts keeps totalRows when already set', () => {
    const upload = processing(200);
    upload.fail('zero valid rows', { processedRows: 0, failedRows: 150, rowErrors: [] });
    expect(upload.totalRows).toBe(200);
  });

  it('fail without counts leaves counts untouched', () => {
    const upload = processing(10);
    upload.recordProgress(4, 2);
    upload.fail('storage object missing');
    expect(upload.processedRows).toBe(4);
    expect(upload.failedRows).toBe(2);
    expect(upload.totalRows).toBe(10);
    expect(upload.rowErrors).toEqual([]);
  });

  it('fail from COMPLETED returns Left', () => {
    const upload = processing();
    upload.complete({ processedRows: 1, failedRows: 0, rowErrors: [] });
    const result = upload.fail('late failure');
    expect(result.isLeft()).toBe(true);
    expect(upload.status).toBe(UploadStatus.COMPLETED);
    expect(upload.errorMessage).toBeNull();
  });

  it('updatedAt advances on mutation', () => {
    const upload = newUpload();
    const created = upload.updatedAt.getTime();
    vi.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));
    upload.startProcessing(2);
    const started = upload.updatedAt.getTime();
    expect(started).toBeGreaterThan(created);
    vi.setSystemTime(new Date('2024-01-01T00:00:20.000Z'));
    upload.recordProgress(1, 0);
    const progressed = upload.updatedAt.getTime();
    expect(progressed).toBeGreaterThan(started);
    vi.setSystemTime(new Date('2024-01-01T00:00:30.000Z'));
    upload.complete({ processedRows: 2, failedRows: 0, rowErrors: [] });
    expect(upload.updatedAt.getTime()).toBeGreaterThan(progressed);
  });

  it('reconstitute keeps the given id and props', () => {
    const original = newUpload();
    const restored = Upload.reconstitute('fixed-id', {
      fileName: original.fileName,
      fileKey: original.fileKey,
      status: UploadStatus.COMPLETED,
      userId: original.userId,
      totalRows: 3,
      processedRows: 3,
      failedRows: 0,
      errorMessage: null,
      rowErrors: [],
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    expect(restored.id).toBe('fixed-id');
    expect(restored.status).toBe(UploadStatus.COMPLETED);
  });

  it('toProps returns a copy that cannot mutate the entity', () => {
    const upload = processing();
    upload.fail('boom', { processedRows: 1, failedRows: 2, rowErrors: errors(2) });

    const props = upload.toProps();
    expect(props.status).toBe(UploadStatus.FAILED);
    expect(props.rowErrors).toEqual(errors(2));

    props.rowErrors.push({ row: 99, message: 'tampered' });
    props.rowErrors[0]!.message = 'tampered';
    props.createdAt.setUTCFullYear(1999);
    props.processedRows = 42;

    expect(upload.rowErrors).toEqual(errors(2));
    expect(upload.createdAt.getUTCFullYear()).toBe(2024);
    expect(upload.processedRows).toBe(1);
  });
});
