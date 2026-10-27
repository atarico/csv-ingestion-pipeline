/**
 * Reliability audit: characterization tests against a real Postgres.
 *
 * Each "BUG" test pins the CURRENT (incorrect) behaviour so the failure mode is reproducible;
 * each "OK" test pins a guarantee that does hold. Interleavings between two workers are forced
 * deterministically with gates injected into the repositories, instead of relying on timing.
 */
import pino from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { createFileUploadedMessage } from '../document-processing/application/messages/FileUploadedMessage.js';
import type { ActivityData } from '../document-processing/domain/entities/ActivityData.js';
import { Upload } from '../document-processing/domain/entities/Upload.js';
import { FileName } from '../document-processing/domain/value-objects/FileName.js';
import { CsvParseCsvParser } from '../document-processing/infrastructure/csv/CsvParseCsvParser.js';
import { PrismaActivityDataRepository } from '../document-processing/infrastructure/persistence/repositories/PrismaActivityDataRepository.js';
import { PrismaUploadRepository } from '../document-processing/infrastructure/persistence/repositories/PrismaUploadRepository.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryMessageQueue } from '../shared/infrastructure/testing/InMemoryMessageQueue.js';
import { createTestPrismaClient, truncateAll } from '../test/db.js';
import { FileProcessingWorker } from './FileProcessingWorker.js';

const ROWS = 1200; // three flushes: 500, 1000 and a final 200

function csv(rows: number): Buffer {
  const lines = ['category,amount,unit,date'];
  for (let i = 1; i <= rows; i++) lines.push(`Electricity,${i},kWh,2024-01-01`);
  return Buffer.from(lines.join('\n') + '\n');
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Upload repository whose save() can be paused by a test-provided hook. */
class HookedUploadRepository extends PrismaUploadRepository {
  beforeSave: (upload: Upload) => Promise<void> = () => Promise.resolve();
  override async save(upload: Upload): Promise<void> {
    await this.beforeSave(upload);
    await super.save(upload);
  }
}

/** Activity repository whose writes can be paused or made to fail. */
class HookedActivityRepository extends PrismaActivityDataRepository {
  saveCalls = 0;
  beforeSaveMany: (call: number, rows: ActivityData[]) => Promise<void> = () => Promise.resolve();
  afterDelete: () => Promise<void> = () => Promise.resolve();
  override async saveMany(rows: ActivityData[]): Promise<void> {
    this.saveCalls += 1;
    await this.beforeSaveMany(this.saveCalls, rows);
    await super.saveMany(rows);
  }
  override async deleteByUploadId(uploadId: string): Promise<void> {
    await super.deleteByUploadId(uploadId);
    await this.afterDelete();
  }
}

describe('Reliability audit (real Postgres)', () => {
  let prisma: PrismaClient;
  let storage: InMemoryFileStorage;
  let queue: InMemoryMessageQueue;
  const logger = pino({ level: 'silent' });

  /** One "worker process": its own repositories (hooks), shared DB / S3 / queue. */
  function workerProcess() {
    const uploads = new HookedUploadRepository(prisma);
    const rows = new HookedActivityRepository(prisma);
    const handler = new ProcessFileCommandHandler(
      uploads,
      rows,
      storage,
      new CsvParseCsvParser(),
      logger,
    );
    const worker = new FileProcessingWorker(queue, handler, uploads, logger, {
      maxReceiveCount: 3,
      pollBackoffMaxMs: 1000,
      retryBackoffBaseSeconds: 15,
      retryBackoffMaxSeconds: 60,
      sqsQueueUrl: 'in-memory',
      random: () => 0,
      sleep: () => Promise.resolve(),
    });
    const deliver = (upload: Upload, receiveCount: number) =>
      worker.handleMessage({
        id: `msg-${upload.id}`,
        receiptHandle: `rh-${receiveCount}`,
        body: createFileUploadedMessage(upload.id, upload.fileKey),
        receiveCount,
      });
    return { uploads, rows, worker, deliver };
  }

  async function seedUpload(rows = ROWS): Promise<Upload> {
    const name = FileName.create('data.csv');
    if (name.isLeft()) throw name.value;
    const upload = Upload.create({ fileName: name.value, userId: 'user-123' });
    storage.files.set(upload.fileKey, csv(rows));
    await new PrismaUploadRepository(prisma).save(upload);
    return upload;
  }

  async function dbState(uploadId: string) {
    const upload = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
    const rows = await prisma.activityData.count({ where: { uploadId } });
    return { status: upload.status, processedRows: upload.processedRows, rowsInDb: rows };
  }

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });
  beforeEach(async () => {
    await truncateAll(prisma);
    storage = new InMemoryFileStorage();
    queue = new InMemoryMessageQueue();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('OK: single worker, crash mid-file then redelivery -> exactly N rows, no duplicates', async () => {
    const upload = await seedUpload();
    const first = workerProcess();
    first.rows.beforeSaveMany = (call) =>
      call === 2 ? Promise.reject(new Error('connection reset')) : Promise.resolve();
    expect(await first.deliver(upload, 1)).toBe('retry');
    expect(await dbState(upload.id)).toMatchObject({ status: 'PROCESSING', rowsInDb: 500 });

    expect(await workerProcess().deliver(upload, 2)).toBe('completed');
    expect(await dbState(upload.id)).toEqual({
      status: 'COMPLETED',
      processedRows: ROWS,
      rowsInDb: ROWS,
    });
  });

  it('OK: duplicate delivery after completion is dropped and does not touch rows', async () => {
    const upload = await seedUpload();
    expect(await workerProcess().deliver(upload, 1)).toBe('completed');
    expect(await workerProcess().deliver(upload, 1)).toBe('dropped');
    expect(await dbState(upload.id)).toMatchObject({ status: 'COMPLETED', rowsInDb: ROWS });
  });

  it('BUG: two workers on the same upload -> COMPLETED with 0 rows, and redelivery drops it', async () => {
    // Worker A (receive #1) inserts every row, then stalls just before saving COMPLETED
    // (GC pause, slow DB, ...). Its 60 s visibility timeout expires with no heartbeat.
    const upload = await seedUpload();
    const a = workerProcess();
    const aAboutToComplete = deferred();
    const releaseA = deferred();
    a.uploads.beforeSave = async (u) => {
      if (u.status.value === 'COMPLETED') {
        aAboutToComplete.resolve();
        await releaseA.promise;
      }
    };
    const aOutcome = a.deliver(upload, 1);
    await aAboutToComplete.promise;
    expect(await dbState(upload.id)).toMatchObject({ status: 'PROCESSING', rowsInDb: ROWS });

    // Worker B (receive #2) sees PROCESSING (not terminal), so it "reprocesses idempotently":
    // deleteByUploadId wipes A's rows. Then B hits a transient error (S3 timeout here; a Spot
    // interruption / SIGKILL after the delete has the same effect).
    storage.failDownloadAt = 2;
    expect(await workerProcess().deliver(upload, 2)).toBe('retry');

    // A wakes up and blindly upserts COMPLETED with its in-memory counters.
    releaseA.resolve();
    expect(await aOutcome).toBe('completed');

    // Redelivery (receive #3) finds a terminal upload and deletes the message.
    expect(await workerProcess().deliver(upload, 3)).toBe('dropped');

    expect(await dbState(upload.id)).toEqual({
      status: 'COMPLETED',
      processedRows: ROWS, // what the API and the UI report
      rowsInDb: 0, // what is actually persisted
    });
  });

  it('BUG: a late progress save regresses COMPLETED back to PROCESSING (lost update)', async () => {
    const upload = await seedUpload();
    const a = workerProcess();
    const b = workerProcess();

    // A inserts every row and stalls just before saving COMPLETED.
    const aAboutToComplete = deferred();
    const releaseA = deferred();
    a.uploads.beforeSave = async (u) => {
      if (u.status.value === 'COMPLETED') {
        aAboutToComplete.resolve();
        await releaseA.promise;
      }
    };
    const aOutcome = a.deliver(upload, 1);
    await aAboutToComplete.promise;

    // B (redelivery) deletes A's rows and stalls.
    const bDeleted = deferred();
    const releaseB = deferred();
    b.rows.afterDelete = async () => {
      bDeleted.resolve();
      await releaseB.promise;
    };
    const bFirstProgress = deferred();
    const releaseB2 = deferred();
    b.rows.beforeSaveMany = async (call) => {
      if (call === 2) {
        bFirstProgress.resolve();
        await releaseB2.promise;
      }
    };
    const bOutcome = b.deliver(upload, 2);
    await bDeleted.promise;

    // A completes: the UI now shows COMPLETED (1200 rows) and stops polling; the table is empty.
    releaseA.resolve();
    expect(await aOutcome).toBe('completed');
    expect(await dbState(upload.id)).toEqual({
      status: 'COMPLETED',
      processedRows: ROWS,
      rowsInDb: 0,
    });

    // B resumes and its first progress save blindly overwrites the terminal state.
    releaseB.resolve();
    await bFirstProgress.promise;
    expect(await dbState(upload.id)).toEqual({
      status: 'PROCESSING', // COMPLETED -> PROCESSING: the state machine is bypassed
      processedRows: 500,
      rowsInDb: 500,
    });

    // Data converges only because B finishes without failing (compare with the previous test).
    releaseB2.resolve();
    expect(await bOutcome).toBe('completed');
    expect(await dbState(upload.id)).toMatchObject({ status: 'COMPLETED', rowsInDb: ROWS });
  });

  it('OBSERVED: if B deletes before A inserts, B dies on the unique index and A wins', async () => {
    const upload = await seedUpload();
    const b = workerProcess();
    const bDeleted = deferred();
    const releaseB = deferred();
    b.rows.afterDelete = async () => {
      bDeleted.resolve();
      await releaseB.promise;
    };
    const bOutcome = b.deliver(upload, 2);
    await bDeleted.promise;

    expect(await workerProcess().deliver(upload, 1)).toBe('completed');
    releaseB.resolve();
    // createMany hits ActivityData_uploadId_rowNumber_key (P2002): an infra exception -> retry.
    expect(await bOutcome).toBe('retry');
    expect(await dbState(upload.id)).toMatchObject({ status: 'COMPLETED', rowsInDb: ROWS });
  });

  it('BUG: failure on the last attempt leaves FAILED uploads with orphan ActivityData rows', async () => {
    const upload = await seedUpload();
    const w = workerProcess();
    w.rows.beforeSaveMany = (call) =>
      call === 2 ? Promise.reject(new Error('Query timeout')) : Promise.resolve();
    expect(await w.deliver(upload, 3)).toBe('dead-lettered');

    const state = await dbState(upload.id);
    expect(state.status).toBe('FAILED');
    expect(state.rowsInDb).toBe(500); // served by GET /uploads/:id/results for a FAILED upload
    const failed = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    // Raw infrastructure error text ends up in the public API field errorMessage.
    expect(failed.errorMessage).toBe('Processing failed after 3 attempts: Query timeout');
  });
});
