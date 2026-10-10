import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../../generated/prisma/client.js';
import type { Upload as UploadRecord } from '../../../../generated/prisma/client.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { PrismaActivityDataMapper } from './PrismaActivityDataMapper.js';
import { PrismaUploadMapper } from './PrismaUploadMapper.js';

function buildUpload(): Upload {
  const fileName = FileName.create('emissions.csv');
  if (fileName.isLeft()) throw fileName.value;
  const upload = Upload.create({ fileName: fileName.value, userId: 'user-123' });
  upload.startProcessing(3);
  upload.complete({
    processedRows: 2,
    failedRows: 1,
    rowErrors: [{ row: 3, field: 'amount', message: 'amount must be greater than 0' }],
  });
  return upload;
}

describe('PrismaUploadMapper', () => {
  it('round-trips an Upload through toPersistence and toDomain', () => {
    const upload = buildUpload();

    const persisted = PrismaUploadMapper.toPersistence(upload);
    const restored = PrismaUploadMapper.toDomain({
      ...persisted,
      rowErrors: persisted.rowErrors as UploadRecord['rowErrors'],
      updatedAt: upload.updatedAt,
    });

    expect(restored.id).toBe(upload.id);
    expect(restored.fileName.value).toBe('emissions.csv');
    expect(restored.fileKey).toBe(upload.fileKey);
    expect(restored.status.value).toBe('COMPLETED');
    expect(restored.userId).toBe('user-123');
    expect(restored.totalRows).toBe(3);
    expect(restored.processedRows).toBe(2);
    expect(restored.failedRows).toBe(1);
    expect(restored.errorMessage).toBeNull();
    expect(restored.rowErrors).toEqual([
      { row: 3, field: 'amount', message: 'amount must be greater than 0' },
    ]);
    expect(restored.createdAt).toEqual(upload.createdAt);
  });

  it('writes rowErrors as a plain array, never undefined', () => {
    const fileName = FileName.create('a.csv');
    if (fileName.isLeft()) throw fileName.value;
    const upload = Upload.create({ fileName: fileName.value, userId: 'user-123' });

    expect(PrismaUploadMapper.toPersistence(upload).rowErrors).toEqual([]);
  });

  it('falls back to [] when the stored rowErrors json is invalid', () => {
    const persisted = PrismaUploadMapper.toPersistence(buildUpload());
    const record: UploadRecord = {
      ...persisted,
      rowErrors: { not: 'an array' },
      updatedAt: new Date(),
    };

    expect(PrismaUploadMapper.toDomain(record).rowErrors).toEqual([]);
  });

  it('treats a null rowErrors column as []', () => {
    const persisted = PrismaUploadMapper.toPersistence(buildUpload());
    const record: UploadRecord = { ...persisted, rowErrors: null, updatedAt: new Date() };

    expect(PrismaUploadMapper.toDomain(record).rowErrors).toEqual([]);
  });

  it('throws when the persisted status or fileName is corrupted', () => {
    const persisted = PrismaUploadMapper.toPersistence(buildUpload());
    const base = {
      ...persisted,
      rowErrors: persisted.rowErrors as UploadRecord['rowErrors'],
      updatedAt: new Date(),
    };

    expect(() =>
      PrismaUploadMapper.toDomain({ ...base, status: 'BOGUS' as UploadRecord['status'] }),
    ).toThrow('Corrupted status in database');
    expect(() => PrismaUploadMapper.toDomain({ ...base, fileName: 'no-extension' })).toThrow(
      'Corrupted fileName in database',
    );
  });
});

describe('PrismaActivityDataMapper', () => {
  it('maps Decimal and Date through UTC', () => {
    const record = {
      id: 'b6d1c1de-8f6b-4a1f-9d67-0b8e1f4c2a11',
      uploadId: 'c0a8f3a2-5f0e-4e0b-8a43-1d2b5f7e9c33',
      rowNumber: 7,
      category: 'Electricity',
      amount: new Prisma.Decimal('150.5000'),
      unit: 'kWh',
      date: new Date('2024-01-15T00:00:00.000Z'),
      createdAt: new Date('2024-02-01T10:00:00.000Z'),
    };

    const row = PrismaActivityDataMapper.toDomain(record);

    expect(row.id).toBe(record.id);
    expect(row.rowNumber).toBe(7);
    expect(row.amount.value).toBe(150.5);
    expect(row.date.toISODate()).toBe('2024-01-15');
  });

  it('writes amount as a string and date as a UTC midnight Date', () => {
    const created = ActivityData.create({
      uploadId: 'c0a8f3a2-5f0e-4e0b-8a43-1d2b5f7e9c33',
      rowNumber: 1,
      category: 'Waste',
      amount: '0.0001',
      unit: 'kg',
      date: '2024-03-09',
    });
    if (created.isLeft()) throw created.value;

    const persisted = PrismaActivityDataMapper.toPersistence(created.value);

    expect(persisted.amount).toBe('0.0001');
    expect(persisted.date).toEqual(new Date('2024-03-09T00:00:00.000Z'));
    expect(persisted.rowNumber).toBe(1);
    expect(persisted.category).toBe('Waste');
  });
});
