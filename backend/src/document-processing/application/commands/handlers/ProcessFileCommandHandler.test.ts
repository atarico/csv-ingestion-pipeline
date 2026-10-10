import pino from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  InvalidStateTransitionError,
  NotFoundError,
  StorageError,
} from '../../../../shared/domain/DomainError.js';
import { InMemoryActivityDataRepository } from '../../../../shared/infrastructure/testing/InMemoryActivityDataRepository.js';
import { InMemoryFileStorage } from '../../../../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryUploadRepository } from '../../../../shared/infrastructure/testing/InMemoryUploadRepository.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { CsvParseCsvParser } from '../../../infrastructure/csv/CsvParseCsvParser.js';
import { ProcessFileCommandHandler } from './ProcessFileCommandHandler.js';

const HEADER = 'category,amount,unit,date';
const VALID_ROW = 'energy,10.5,kWh,2026-01-15';

function repeat(row: string, times: number): string[] {
  return Array.from({ length: times }, () => row);
}

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n') + '\n';
}

describe('ProcessFileCommandHandler', () => {
  let uploadRepository: InMemoryUploadRepository;
  let activityDataRepository: InMemoryActivityDataRepository;
  let fileStorage: InMemoryFileStorage;
  let handler: ProcessFileCommandHandler;

  beforeEach(() => {
    uploadRepository = new InMemoryUploadRepository();
    activityDataRepository = new InMemoryActivityDataRepository();
    fileStorage = new InMemoryFileStorage();
    handler = new ProcessFileCommandHandler(
      uploadRepository,
      activityDataRepository,
      fileStorage,
      new CsvParseCsvParser(),
      pino({ level: 'silent' }),
    );
  });

  async function seedUpload(content: string): Promise<Upload> {
    const fileName = FileName.create('data.csv');
    if (fileName.isLeft()) throw fileName.value;
    const upload = Upload.create({ fileName: fileName.value, userId: 'user-123' });
    fileStorage.files.set(upload.fileKey, Buffer.from(content));
    await uploadRepository.save(upload);
    uploadRepository.saveSnapshots.length = 0;
    return upload;
  }

  async function persisted(upload: Upload): Promise<Upload> {
    const stored = await uploadRepository.findById(upload.id);
    if (!stored) throw new Error('upload must be persisted');
    return stored;
  }

  function run(upload: Upload) {
    return handler.execute({ uploadId: upload.id, fileKey: upload.fileKey });
  }

  it('completes an upload with all valid rows', async () => {
    const upload = await seedUpload(csv(...repeat(VALID_ROW, 5)));

    const result = await run(upload);

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({
      uploadId: upload.id,
      status: 'COMPLETED',
      totalRows: 5,
      processedRows: 5,
      failedRows: 0,
    });
    expect(activityDataRepository.rows).toHaveLength(5);
    const stored = await persisted(upload);
    expect(stored.totalRows).toBe(5);
    expect(stored.status.value).toBe('COMPLETED');
  });

  it('completes with partial failures and records row errors', async () => {
    const upload = await seedUpload(
      csv(VALID_ROW, 'energy,abc,kWh,2026-01-15', VALID_ROW, 'energy,10,kWh,not-a-date', VALID_ROW),
    );

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'COMPLETED', processedRows: 3, failedRows: 2 });
    const stored = await persisted(upload);
    expect(stored.rowErrors).toHaveLength(2);
    expect(stored.rowErrors.map((e) => [e.row, e.field])).toEqual([
      [2, 'amount'],
      [4, 'date'],
    ]);
  });

  it('records one RowError per invalid field', async () => {
    const upload = await seedUpload(csv(VALID_ROW, 'energy,10,,not-a-date'));

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'COMPLETED', processedRows: 1, failedRows: 1 });
    const stored = await persisted(upload);
    expect(stored.rowErrors).toHaveLength(2);
    expect(stored.rowErrors.map((e) => [e.row, e.field])).toEqual([
      [2, 'unit'],
      [2, 'date'],
    ]);
  });

  it('fails on invalid header', async () => {
    const upload = await seedUpload('category,amount,unit\nenergy,1,kWh\n');

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'FAILED', totalRows: 0 });
    const stored = await persisted(upload);
    expect(stored.status.value).toBe('FAILED');
    expect(stored.errorMessage).toContain('Invalid CSV header');
    expect(stored.totalRows).toBeNull();
    expect(stored.processedRows).toBeNull();
    expect(stored.failedRows).toBeNull();
  });

  it('fails on empty file', async () => {
    const upload = await seedUpload('');

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'FAILED' });
    const stored = await persisted(upload);
    expect(stored.errorMessage).toBe('CSV is empty');
  });

  it('fails on header-only file', async () => {
    const upload = await seedUpload(csv());

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'FAILED', processedRows: 0, failedRows: 0 });
    const stored = await persisted(upload);
    expect(stored.errorMessage).toBe('CSV has no data rows');
    expect(stored.processedRows).toBe(0);
    expect(stored.failedRows).toBe(0);
  });

  it('fails when no row is valid with failedRows equal to data rows', async () => {
    const upload = await seedUpload(csv(...repeat('energy,-1,kWh,2026-01-15', 4)));

    const result = await run(upload);

    expect(result.value).toMatchObject({
      status: 'FAILED',
      totalRows: 4,
      processedRows: 0,
      failedRows: 4,
    });
    const stored = await persisted(upload);
    expect(stored.errorMessage).toBe('No valid rows found');
    expect(stored.rowErrors).toHaveLength(4);
    expect(activityDataRepository.rows).toHaveLength(0);
  });

  it('returns NotFound for unknown upload', async () => {
    const result = await handler.execute({
      uploadId: '00000000-0000-4000-8000-000000000000',
      fileKey: 'uploads/x/data.csv',
    });

    expect(result.value).toBeInstanceOf(NotFoundError);
  });

  it('returns InvalidStateTransition for a COMPLETED upload', async () => {
    const upload = await seedUpload(csv(VALID_ROW));
    await run(upload);

    const result = await run(upload);

    expect(result.value).toBeInstanceOf(InvalidStateTransitionError);
  });

  it('returns StorageError and leaves PENDING when download fails', async () => {
    const upload = await seedUpload(csv(VALID_ROW));
    fileStorage.failNextDownload = true;

    const result = await run(upload);

    expect(result.value).toBeInstanceOf(StorageError);
    const stored = await persisted(upload);
    expect(stored.status.value).toBe('PENDING');
  });

  it('reprocesses a PROCESSING upload after redelivery without duplicates', async () => {
    const upload = await seedUpload(csv(VALID_ROW, VALID_ROW, VALID_ROW));
    upload.startProcessing(3);
    await uploadRepository.save(upload);
    const stale = [1, 2].map((rowNumber) =>
      ActivityData.create({
        uploadId: upload.id,
        rowNumber,
        category: 'stale',
        amount: '1',
        unit: 'kg',
        date: '2025-01-01',
      }),
    );
    await activityDataRepository.saveMany(stale.flatMap((r) => (r.isRight() ? [r.value] : [])));
    expect(activityDataRepository.rows).toHaveLength(2);

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'COMPLETED', processedRows: 3 });
    expect(activityDataRepository.rows).toHaveLength(3);
    expect(activityDataRepository.rows.every((r) => r.category.value === 'energy')).toBe(true);
  });

  it('records progress every 500 data rows', async () => {
    // Every 12th row is invalid: 100 invalid rows and 1100 valid rows out of 1200.
    const rows = Array.from({ length: 1200 }, (_, i) =>
      (i + 1) % 12 === 0 ? 'energy,-1,kWh,2026-01-15' : VALID_ROW,
    );
    const upload = await seedUpload(csv(...rows));

    const result = await run(upload);

    expect(result.value).toMatchObject({
      status: 'COMPLETED',
      processedRows: 1100,
      failedRows: 100,
    });
    const processing = uploadRepository.saveSnapshots
      .filter((s) => s.status === 'PROCESSING')
      .map((s) => (s.processedRows ?? 0) + (s.failedRows ?? 0));
    expect(processing).toEqual([0, 500, 1000]);
    expect(uploadRepository.saveSnapshots.at(-1)?.status).toBe('COMPLETED');
  });

  it('caps rowErrors at 100', async () => {
    const upload = await seedUpload(csv(...repeat('energy,-1,kWh,2026-01-15', 150), VALID_ROW));

    const result = await run(upload);

    expect(result.value).toMatchObject({ status: 'COMPLETED', processedRows: 1, failedRows: 150 });
    const stored = await persisted(upload);
    expect(stored.rowErrors).toHaveLength(100);
    expect(stored.failedRows).toBe(150);
  });
});
