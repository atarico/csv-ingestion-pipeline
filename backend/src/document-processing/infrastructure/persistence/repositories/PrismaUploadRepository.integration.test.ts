import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { createTestPrismaClient, truncateAll } from '../../../../test/db.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { PrismaUploadRepository } from './PrismaUploadRepository.js';

const USER_ID = 'user-123';
const SAME_INSTANT = new Date(Date.UTC(2024, 0, 1));
/** Ascending on purpose: insertion order is the opposite of the expected `id desc` order. */
const IDS = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];

function uploadWith(id: string, createdAt: Date): Upload {
  const fileName = FileName.create('data.csv');
  if (fileName.isLeft()) throw fileName.value;
  return Upload.reconstitute(id, {
    fileName: fileName.value,
    fileKey: `uploads/${id}/data.csv`,
    status: Upload.create({ fileName: fileName.value, userId: USER_ID }).status,
    userId: USER_ID,
    totalRows: null,
    processedRows: null,
    failedRows: null,
    errorMessage: null,
    errorCode: null,
    errorDetails: null,
    rowErrors: [],
    createdAt,
    updatedAt: createdAt,
  });
}

describe('PrismaUploadRepository pagination', () => {
  const prisma: PrismaClient = createTestPrismaClient();
  const uploads = new PrismaUploadRepository(prisma);

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('breaks createdAt ties by id descending, identically on every call', async () => {
    for (const id of IDS) await uploads.save(uploadWith(id, SAME_INSTANT));
    const expected = [...IDS].reverse();

    const firstPage = await uploads.findByUser(USER_ID, { page: 1, limit: 2 });
    const firstPageAgain = await uploads.findByUser(USER_ID, { page: 1, limit: 2 });
    const secondPage = await uploads.findByUser(USER_ID, { page: 2, limit: 2 });

    expect(firstPage.items.map((upload) => upload.id)).toEqual(expected.slice(0, 2));
    expect(firstPageAgain.items.map((upload) => upload.id)).toEqual(expected.slice(0, 2));
    expect(secondPage.items.map((upload) => upload.id)).toEqual(expected.slice(2));
    expect(firstPage.total).toBe(3);
  });
});
