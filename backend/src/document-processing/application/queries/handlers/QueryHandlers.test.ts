import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../../shared/domain/DomainError.js';
import { InMemoryActivityDataRepository } from '../../../../shared/infrastructure/testing/InMemoryActivityDataRepository.js';
import { InMemoryUploadRepository } from '../../../../shared/infrastructure/testing/InMemoryUploadRepository.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { UploadStatus } from '../../../domain/value-objects/UploadStatus.js';
import { GetUploadByIdQueryHandler } from './GetUploadByIdQueryHandler.js';
import { GetUploadResultsQueryHandler } from './GetUploadResultsQueryHandler.js';
import { GetUploadStatsQueryHandler } from './GetUploadStatsQueryHandler.js';
import { ListUploadsQueryHandler } from './ListUploadsQueryHandler.js';

const USER = 'user-123';

function buildUpload(options: { userId?: string; status?: UploadStatus; createdAt?: Date } = {}) {
  const fileName = FileName.create('data.csv');
  if (fileName.isLeft()) throw fileName.value;
  const created = Upload.create({ fileName: fileName.value, userId: options.userId ?? USER });
  const createdAt = options.createdAt ?? created.createdAt;
  return Upload.reconstitute(created.id, {
    fileName: fileName.value,
    fileKey: created.fileKey,
    status: options.status ?? UploadStatus.PENDING,
    userId: options.userId ?? USER,
    totalRows: null,
    processedRows: null,
    failedRows: null,
    errorMessage: null,
    errorCode: null,
    errorDetails: null,
    rowErrors: [{ row: 2, field: 'amount', code: 'INVALID_NUMBER', message: 'bad' }],
    createdAt,
    updatedAt: createdAt,
  });
}

function buildRow(uploadId: string, rowNumber: number): ActivityData {
  const row = ActivityData.create({
    uploadId,
    rowNumber,
    category: 'energy',
    amount: '10.5',
    unit: 'kWh',
    date: '2026-01-15',
  });
  if (row.isLeft()) throw row.value;
  return row.value;
}

describe('query handlers', () => {
  let uploadRepository: InMemoryUploadRepository;
  let activityDataRepository: InMemoryActivityDataRepository;

  beforeEach(() => {
    uploadRepository = new InMemoryUploadRepository();
    activityDataRepository = new InMemoryActivityDataRepository();
  });

  describe('GetUploadById', () => {
    it('returns dto', async () => {
      const upload = buildUpload();
      await uploadRepository.save(upload);

      const result = await new GetUploadByIdQueryHandler(uploadRepository).execute({
        id: upload.id,
        userId: USER,
      });

      expect(result.isRight()).toBe(true);
      expect(result.value).toEqual({
        id: upload.id,
        fileName: 'data.csv',
        status: 'PENDING',
        totalRows: null,
        processedRows: null,
        failedRows: null,
        errorMessage: null,
        errorCode: null,
        errorDetails: null,
        rowErrors: [{ row: 2, field: 'amount', code: 'INVALID_NUMBER', message: 'bad' }],
        createdAt: upload.createdAt.toISOString(),
        updatedAt: upload.updatedAt.toISOString(),
      });
    });

    it('returns NotFound for other user', async () => {
      const upload = buildUpload({ userId: 'someone-else' });
      await uploadRepository.save(upload);

      const result = await new GetUploadByIdQueryHandler(uploadRepository).execute({
        id: upload.id,
        userId: USER,
      });

      expect(result.value).toBeInstanceOf(NotFoundError);
    });

    it('returns NotFound for missing', async () => {
      const result = await new GetUploadByIdQueryHandler(uploadRepository).execute({
        id: 'missing',
        userId: USER,
      });

      expect(result.value).toBeInstanceOf(NotFoundError);
    });
  });

  describe('ListUploads', () => {
    it('paginates newest first with totalPages', async () => {
      const base = Date.UTC(2026, 0, 1);
      const uploads = Array.from({ length: 12 }, (_, i) =>
        buildUpload({ createdAt: new Date(base + i * 60_000) }),
      );
      for (const upload of uploads) await uploadRepository.save(upload);
      const handler = new ListUploadsQueryHandler(uploadRepository);

      const first = await handler.execute({ userId: USER, page: 1, limit: 10 });
      const second = await handler.execute({ userId: USER, page: 2, limit: 10 });

      expect(first.isRight()).toBe(true);
      if (!first.isRight() || !second.isRight()) return;
      expect(first.value.data).toHaveLength(10);
      expect(first.value).toMatchObject({ total: 12, page: 1, limit: 10, totalPages: 2 });
      expect(first.value.data[0]?.id).toBe(uploads[11]?.id);
      expect(first.value.data[0]).not.toHaveProperty('rowErrors');
      expect(second.value.data).toHaveLength(2);
      expect(second.value.data[1]?.id).toBe(uploads[0]?.id);
    });
  });

  describe('GetUploadResults', () => {
    it('paginates by rowNumber and checks ownership', async () => {
      const upload = buildUpload({ status: UploadStatus.COMPLETED });
      const foreign = buildUpload({ userId: 'someone-else' });
      await uploadRepository.save(upload);
      await uploadRepository.save(foreign);
      await activityDataRepository.saveMany([3, 1, 2].map((n) => buildRow(upload.id, n)));
      const handler = new GetUploadResultsQueryHandler(uploadRepository, activityDataRepository);

      const page = await handler.execute({ uploadId: upload.id, userId: USER, page: 1, limit: 2 });
      const denied = await handler.execute({
        uploadId: foreign.id,
        userId: USER,
        page: 1,
        limit: 2,
      });
      const missing = await handler.execute({
        uploadId: 'missing',
        userId: USER,
        page: 1,
        limit: 2,
      });

      expect(page.isRight()).toBe(true);
      if (!page.isRight()) return;
      expect(page.value).toMatchObject({ total: 3, page: 1, limit: 2, totalPages: 2 });
      expect(page.value.data.map((r) => r.rowNumber)).toEqual([1, 2]);
      expect(page.value.data[0]).toMatchObject({
        category: 'energy',
        amount: 10.5,
        unit: 'kWh',
        date: '2026-01-15',
      });
      expect(denied.value).toBeInstanceOf(NotFoundError);
      expect(missing.value).toBeInstanceOf(NotFoundError);
    });

    it('returns an empty page for an upload without rows', async () => {
      const upload = buildUpload();
      await uploadRepository.save(upload);

      const result = await new GetUploadResultsQueryHandler(
        uploadRepository,
        activityDataRepository,
      ).execute({ uploadId: upload.id, userId: USER, page: 1, limit: 10 });

      expect(result.value).toEqual({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    });
  });

  describe('GetUploadStats', () => {
    it('sums counts', async () => {
      const statuses = [
        ...Array.from({ length: 2 }, () => UploadStatus.PENDING),
        UploadStatus.PROCESSING,
        ...Array.from({ length: 3 }, () => UploadStatus.COMPLETED),
        UploadStatus.FAILED,
      ];
      for (const status of statuses) await uploadRepository.save(buildUpload({ status }));
      await uploadRepository.save(buildUpload({ userId: 'someone-else' }));

      const result = await new GetUploadStatsQueryHandler(uploadRepository).execute({
        userId: USER,
      });

      expect(result.value).toEqual({
        total: 7,
        pending: 2,
        processing: 1,
        completed: 3,
        failed: 1,
      });
    });
  });
});
