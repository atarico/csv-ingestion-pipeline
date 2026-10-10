import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUploadedMessageSchema } from '../application/messages/FileUploadedMessage.js';
import { ActivityData } from '../domain/entities/ActivityData.js';
import { Upload } from '../domain/entities/Upload.js';
import { FileName } from '../domain/value-objects/FileName.js';
import type { IActivityDataRepository } from '../domain/repositories/IActivityDataRepository.js';
import type { IUploadRepository } from '../domain/repositories/IUploadRepository.js';
import {
  buildTestApp,
  persistedUploadStatuses,
  resetTestState,
  type TestApp,
} from '../../test/buildTestApp.js';
import { buildMultipart } from '../../test/multipart.js';

const USER_ID = 'user-123';
const API = '/api/v1';
const CSV = 'category,amount,unit,date\nElectricity,10.5,kWh,2024-01-15\n';

interface FilePart {
  fileName: string;
  content: string | Buffer;
  mimeType?: string;
}

/** A multipart body without any file part (only a text field). */
function multipartWithoutFile(): { payload: Buffer; headers: Record<string, string> } {
  const boundary = '----vitest-boundary';
  return {
    payload: Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello\r\n--${boundary}--\r\n`,
    ),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

async function postUpload(ctx: TestApp, part?: FilePart) {
  const { payload, headers } =
    part === undefined
      ? multipartWithoutFile()
      : buildMultipart(part.fileName, part.content, part.mimeType);
  return ctx.app.inject({ method: 'POST', url: `${API}/uploads`, payload, headers });
}

async function seedUpload(
  repo: IUploadRepository,
  name = 'data.csv',
  createdAt?: Date,
): Promise<Upload> {
  const fileName = FileName.create(name);
  if (fileName.isLeft()) throw fileName.value;
  const created = Upload.create({ fileName: fileName.value, userId: USER_ID });
  const upload =
    createdAt === undefined
      ? created
      : Upload.reconstitute(created.id, {
          fileName: fileName.value,
          fileKey: created.fileKey,
          status: created.status,
          userId: USER_ID,
          totalRows: null,
          processedRows: null,
          failedRows: null,
          errorMessage: null,
          rowErrors: [],
          createdAt,
          updatedAt: createdAt,
        });
  await repo.save(upload);
  return upload;
}

async function seedRows(repo: IActivityDataRepository, uploadId: string, count: number) {
  const rows = Array.from({ length: count }, (_, index) => {
    const row = ActivityData.create({
      uploadId,
      rowNumber: index + 1,
      category: 'Electricity',
      amount: '10.5',
      unit: 'kWh',
      date: '2024-01-15',
    });
    if (row.isLeft()) throw row.value;
    return row.value;
  });
  await repo.saveMany(rows);
}

describe('Uploads REST API', () => {
  let ctx: TestApp;
  const extraApps: TestApp[] = [];
  let uploads: IUploadRepository;
  let activityData: IActivityDataRepository;

  beforeAll(async () => {
    ctx = await buildTestApp();
    uploads = ctx.container.resolve<IUploadRepository>('uploadRepository');
    activityData = ctx.container.resolve<IActivityDataRepository>('activityDataRepository');
  });

  beforeEach(async () => {
    await resetTestState(ctx);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const extra of extraApps.splice(0)) {
      await extra.app.close();
      await extra.container.dispose();
    }
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.container.dispose();
  });

  it('GET /health returns ok with a request id header', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  describe('POST /uploads', () => {
    it('with a csv stores the file, saves the record and publishes the message', async () => {
      const response = await postUpload(ctx, { fileName: 'sample.csv', content: CSV });

      expect(response.statusCode).toBe(201);
      const body = response.json<{
        id: string;
        status: string;
        fileName: string;
        createdAt: string;
      }>();
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.status).toBe('PENDING');
      expect(body.fileName).toBe('sample.csv');
      expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
      expect(ctx.queue.published).toHaveLength(1);
      expect(FileUploadedMessageSchema.safeParse(ctx.queue.published[0]).success).toBe(true);
      expect(ctx.storage.files.has(`uploads/${body.id}/sample.csv`)).toBe(true);
      expect(await persistedUploadStatuses(ctx)).toEqual(['PENDING']);
    });

    it('without a file returns 400 VALIDATION_ERROR on field file', async () => {
      const response = await postUpload(ctx);
      expect(response.statusCode).toBe(400);
      const body = response.json<{ error: { code: string; details: Array<{ field: string }> } }>();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details[0]?.field).toBe('file');
    });

    it('with data.txt returns 400 UNSUPPORTED_FILE', async () => {
      const response = await postUpload(ctx, { fileName: 'data.txt', content: CSV });
      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('UNSUPPORTED_FILE');
    });

    it('with an empty file returns 400 VALIDATION_ERROR', async () => {
      const response = await postUpload(ctx, { fileName: 'empty.csv', content: '' });
      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR');
    });

    it('without multipart content type returns 400 VALIDATION_ERROR', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: `${API}/uploads`,
        payload: { a: 1 },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR');
    });

    it('over the size limit returns 413 FILE_TOO_LARGE', async () => {
      const small = await buildTestApp({ maxFileSizeBytes: 1024 });
      extraApps.push(small);
      const { payload, headers } = buildMultipart('big.csv', Buffer.alloc(2048, 'a'));
      const response = await small.app.inject({
        method: 'POST',
        url: `${API}/uploads`,
        payload,
        headers,
      });
      expect(response.statusCode).toBe(413);
      const body = response.json<{ error: { code: string }; requestId: string }>();
      expect(body.error.code).toBe('FILE_TOO_LARGE');
      expect(body.requestId).toBeTruthy();
    });

    it('when storage fails returns 502 STORAGE_ERROR and saves no record', async () => {
      ctx.storage.failNextUpload = true;
      const response = await postUpload(ctx, { fileName: 'sample.csv', content: CSV });
      expect(response.statusCode).toBe(502);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('STORAGE_ERROR');
      expect(await persistedUploadStatuses(ctx)).toEqual([]);
    });

    it('when publish fails returns 502 MESSAGING_ERROR and marks the record FAILED', async () => {
      ctx.queue.failNextPublish = true;
      const response = await postUpload(ctx, { fileName: 'sample.csv', content: CSV });
      expect(response.statusCode).toBe(502);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('MESSAGING_ERROR');
      expect(await persistedUploadStatuses(ctx)).toEqual(['FAILED']);
    });
  });

  describe('GET /uploads/:id', () => {
    it('returns the UploadDto with rowErrors', async () => {
      const upload = await seedUpload(uploads);
      const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/${upload.id}` });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: upload.id,
        fileName: 'data.csv',
        status: 'PENDING',
        rowErrors: [],
        errorMessage: null,
      });
    });

    it('unknown uuid returns 404 NOT_FOUND', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: `${API}/uploads/${randomUUID()}`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND');
    });

    it('non-uuid id returns 400 VALIDATION_ERROR on field id', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/abc` });
      expect(response.statusCode).toBe(400);
      const body = response.json<{ error: { code: string; details: Array<{ field: string }> } }>();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details[0]?.field).toBe('id');
    });
  });

  describe('GET /uploads', () => {
    it('paginates newest first', async () => {
      const base = Date.parse('2024-03-01T00:00:00.000Z');
      for (let index = 0; index < 12; index += 1) {
        await seedUpload(uploads, `file-${index}.csv`, new Date(base + index * 1000));
      }
      const response = await ctx.app.inject({
        method: 'GET',
        url: `${API}/uploads?page=2&limit=10`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json<{
        data: Array<{ fileName: string }>;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>();
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(12);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(10);
      expect(body.totalPages).toBe(2);
      expect(body.data.map((item) => item.fileName)).toEqual(['file-1.csv', 'file-0.csv']);
    });

    it('limit=1000 returns 400', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads?limit=1000` });
      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('VALIDATION_ERROR');
    });
  });

  it('GET /uploads/stats returns counts per status and total', async () => {
    await seedUpload(uploads, 'a.csv');
    const failed = await seedUpload(uploads, 'b.csv');
    failed.fail('boom');
    await uploads.save(failed);

    const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/stats` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 2,
      pending: 1,
      processing: 0,
      completed: 0,
      failed: 1,
    });
  });

  describe('GET /uploads/:id/results', () => {
    it('returns rows ordered by rowNumber with default limit 100', async () => {
      const upload = await seedUpload(uploads);
      await seedRows(activityData, upload.id, 3);

      const response = await ctx.app.inject({
        method: 'GET',
        url: `${API}/uploads/${upload.id}/results`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json<{
        data: Array<{ rowNumber: number; amount: number; date: string }>;
        total: number;
        page: number;
        limit: number;
      }>();
      expect(body.data.map((row) => row.rowNumber)).toEqual([1, 2, 3]);
      expect(body.data[0]).toMatchObject({ amount: 10.5, date: '2024-01-15' });
      expect(body.total).toBe(3);
      expect(body.limit).toBe(100);
      expect(body.page).toBe(1);
    });

    it('limit=501 returns 400', async () => {
      const upload = await seedUpload(uploads);
      const response = await ctx.app.inject({
        method: 'GET',
        url: `${API}/uploads/${upload.id}/results?limit=501`,
      });
      expect(response.statusCode).toBe(400);
    });

    it('unknown upload returns 404', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: `${API}/uploads/${randomUUID()}/results`,
      });
      expect(response.statusCode).toBe(404);
      expect(response.json<{ error: { code: string } }>().error.code).toBe('NOT_FOUND');
    });
  });

  it('unknown route returns 404 NOT_FOUND with requestId', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/nope' });
    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string; message: string }; requestId: string }>();
    expect(body.error).toEqual({ code: 'NOT_FOUND', message: 'Route not found' });
    expect(body.requestId).toBe(response.headers['x-request-id']);
  });

  it('an unexpected exception returns 500 INTERNAL_ERROR without leaking its message', async () => {
    vi.spyOn(uploads, 'findById').mockRejectedValueOnce(new Error('secret database exploded'));
    const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/${randomUUID()}` });
    expect(response.statusCode).toBe(500);
    const body = response.json<{ error: { code: string; message: string }; requestId: string }>();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.requestId).toBeTruthy();
    expect(response.body).not.toContain('secret database exploded');
  });
});
