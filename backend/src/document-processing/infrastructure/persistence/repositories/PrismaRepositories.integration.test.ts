import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { createTestPrismaClient, truncateAll } from '../../../../test/db.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { PrismaActivityDataRepository } from './PrismaActivityDataRepository.js';
import { PrismaUploadRepository } from './PrismaUploadRepository.js';

const USER_ID = 'user-123';

function newUpload(userId = USER_ID, name = 'data.csv'): Upload {
  const fileName = FileName.create(name);
  if (fileName.isLeft()) throw fileName.value;
  return Upload.create({ fileName: fileName.value, userId });
}

function newRow(uploadId: string, rowNumber: number, amount = '10.5'): ActivityData {
  const row = ActivityData.create({
    uploadId,
    rowNumber,
    category: 'Electricity',
    amount,
    unit: 'kWh',
    date: '2024-01-15',
  });
  if (row.isLeft()) throw row.value;
  return row.value;
}

describe('Prisma repositories', () => {
  const prisma: PrismaClient = createTestPrismaClient();
  const uploads = new PrismaUploadRepository(prisma);
  const rows = new PrismaActivityDataRepository(prisma);

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('PrismaUploadRepository', () => {
    it('save inserts then updates (upsert)', async () => {
      const upload = newUpload();
      await uploads.save(upload);
      expect((await uploads.findById(upload.id))?.status.value).toBe('PENDING');

      upload.startProcessing(10);
      await uploads.save(upload);

      const stored = await uploads.findById(upload.id);
      expect(stored?.status.value).toBe('PROCESSING');
      expect(stored?.totalRows).toBe(10);
      expect(await prisma.upload.count()).toBe(1);
    });

    it('persists rowErrors and failure details', async () => {
      const upload = newUpload();
      upload.fail('Invalid CSV header: missing [date]', {
        processedRows: 0,
        failedRows: 1,
        rowErrors: [{ row: 1, field: 'date', message: 'date is required' }],
      });
      await uploads.save(upload);

      const stored = await uploads.findById(upload.id);
      expect(stored?.status.value).toBe('FAILED');
      expect(stored?.errorMessage).toBe('Invalid CSV header: missing [date]');
      expect(stored?.rowErrors).toEqual([{ row: 1, field: 'date', message: 'date is required' }]);
    });

    it('findById returns null for unknown', async () => {
      expect(await uploads.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
    });

    it('findByUser orders newest first and paginates', async () => {
      for (let i = 0; i < 12; i += 1) {
        const upload = newUpload();
        await uploads.save(upload);
        await prisma.upload.update({
          where: { id: upload.id },
          data: { createdAt: new Date(Date.UTC(2024, 0, 1 + i)) },
        });
      }
      await uploads.save(newUpload('someone-else'));

      const page1 = await uploads.findByUser(USER_ID, { page: 1, limit: 10 });
      const page2 = await uploads.findByUser(USER_ID, { page: 2, limit: 10 });

      expect(page1.total).toBe(12);
      expect(page1.items).toHaveLength(10);
      expect(page2.items).toHaveLength(2);
      expect(page2.total).toBe(12);
      expect(page1.items[0]?.createdAt).toEqual(new Date(Date.UTC(2024, 0, 12)));
      expect(page2.items[1]?.createdAt).toEqual(new Date(Date.UTC(2024, 0, 1)));
    });

    it('countByStatus fills zeros', async () => {
      const processing = newUpload();
      processing.startProcessing(1);
      await uploads.save(processing);
      await uploads.save(newUpload());
      await uploads.save(newUpload('someone-else'));

      expect(await uploads.countByStatus(USER_ID)).toEqual({
        PENDING: 1,
        PROCESSING: 1,
        COMPLETED: 0,
        FAILED: 0,
      });
      expect(await uploads.countByStatus('nobody')).toEqual({
        PENDING: 0,
        PROCESSING: 0,
        COMPLETED: 0,
        FAILED: 0,
      });
    });
  });

  describe('PrismaActivityDataRepository', () => {
    it('saveMany + findByUploadId keeps order, Decimal and Date fidelity', async () => {
      const upload = newUpload();
      await uploads.save(upload);
      const batch = Array.from({ length: 1200 }, (_, i) =>
        newRow(upload.id, i + 1, i === 0 ? '0.0001' : '10.5'),
      );
      // Shuffle so ordering must come from rowNumber, not insertion order.
      await rows.saveMany([...batch].reverse());

      const page1 = await rows.findByUploadId(upload.id, { page: 1, limit: 50 });
      const last = await rows.findByUploadId(upload.id, { page: 24, limit: 50 });

      expect(page1.total).toBe(1200);
      expect(page1.items).toHaveLength(50);
      expect(page1.items[0]?.rowNumber).toBe(1);
      expect(page1.items[0]?.amount.value).toBe(0.0001);
      expect(page1.items[1]?.amount.value).toBe(10.5);
      expect(page1.items[0]?.date.toISODate()).toBe('2024-01-15');
      expect(last.items.at(-1)?.rowNumber).toBe(1200);
      expect(await rows.countByUploadId(upload.id)).toBe(1200);
    });

    it('deleteByUploadId removes rows and cascade on upload delete works', async () => {
      const first = newUpload();
      const second = newUpload();
      await uploads.save(first);
      await uploads.save(second);
      await rows.saveMany([newRow(first.id, 1), newRow(first.id, 2), newRow(second.id, 1)]);

      await rows.deleteByUploadId(first.id);
      expect(await rows.countByUploadId(first.id)).toBe(0);
      expect(await rows.countByUploadId(second.id)).toBe(1);

      await prisma.upload.delete({ where: { id: second.id } });
      expect(await rows.countByUploadId(second.id)).toBe(0);
    });

    it('saveMany with no rows is a no-op', async () => {
      await expect(rows.saveMany([])).resolves.toBeUndefined();
    });

    it('unique (uploadId, rowNumber) rejects duplicates', async () => {
      const upload = newUpload();
      await uploads.save(upload);
      await rows.saveMany([newRow(upload.id, 1)]);

      await expect(rows.saveMany([newRow(upload.id, 1)])).rejects.toThrow();
    });
  });
});
