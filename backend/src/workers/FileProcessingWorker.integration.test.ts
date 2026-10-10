import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, resetTestState, type TestApp } from '../test/buildTestApp.js';
import { FileProcessingWorker } from './FileProcessingWorker.js';

const API = '/api/v1';
const HEADER = 'category,amount,unit,date';

interface UploadResponse {
  status: string;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  rowErrors: Array<{ row: number; field?: string; message: string }>;
}

/** Valid rows 1..count with distinct dates so ordering by rowNumber is observable. */
function validRows(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `Electricity,${index + 1}.5,kWh,2024-01-${String(index + 1).padStart(2, '0')}`,
  );
}

/** 25 data rows: 19 valid, 6 invalid rows carrying 7 field errors (row 23 has two). */
function sampleWithErrorsCsv(): string {
  const rows = validRows(25);
  rows[3] = 'Electricity,-5,kWh,2024-01-04'; // amount
  rows[7] = 'Electricity,abc,kWh,2024-01-08'; // amount
  rows[11] = ',10,kWh,2024-01-12'; // category
  rows[15] = 'Electricity,10,,2024-01-16'; // unit
  rows[19] = 'Electricity,10,kWh,2024-13-45'; // date
  rows[22] = 'Electricity,0,kWh,not-a-date'; // row 23: amount and date
  return [HEADER, ...rows].join('\n') + '\n';
}

describe('FileProcessingWorker (real Postgres, in-memory storage and queue)', () => {
  let ctx: TestApp;
  let worker: FileProcessingWorker;
  const sleeps: number[] = [];

  beforeAll(async () => {
    ctx = await buildTestApp();
    worker = new FileProcessingWorker(
      ctx.queue,
      ctx.container.resolve('processFileCommandHandler'),
      ctx.container.resolve('uploadRepository'),
      ctx.container.resolve('logger'),
      {
        maxReceiveCount: 3,
        pollBackoffMaxMs: 30000,
        retryBackoffBaseSeconds: 15,
        retryBackoffMaxSeconds: 60,
        sqsQueueUrl: 'in-memory',
        random: () => 0,
        sleep: (ms) => {
          sleeps.push(ms);
          return Promise.resolve();
        },
      },
    );
  });

  beforeEach(() => resetTestState(ctx));
  afterEach(() => {
    sleeps.length = 0;
  });
  afterAll(async () => {
    await ctx.app.close();
    await ctx.container.dispose();
  });

  async function postCsv(content: string, fileName = 'data.csv'): Promise<string> {
    const boundary = `----carbonbox${randomUUID()}`;
    const payload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n${content}\r\n--${boundary}--\r\n`,
    );
    const response = await ctx.app.inject({
      method: 'POST',
      url: `${API}/uploads`,
      payload,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
    expect(response.statusCode).toBe(201);
    return response.json<{ id: string }>().id;
  }

  async function getUpload(id: string): Promise<UploadResponse> {
    const response = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/${id}` });
    return response.json<UploadResponse>();
  }

  it('end to end: upload -> processOnce -> COMPLETED -> results', async () => {
    const id = await postCsv([HEADER, ...validRows(5)].join('\n') + '\n');

    await worker.processOnce();

    const upload = await getUpload(id);
    expect(upload.status).toBe('COMPLETED');
    expect(upload.processedRows).toBe(5);
    const results = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/${id}/results` });
    const rows = results.json<{ data: Array<{ amount: number; date: string }> }>().data;
    expect(rows.map((row) => row.amount)).toEqual([1.5, 2.5, 3.5, 4.5, 5.5]);
    expect(ctx.queue.inFlightCount).toBe(0);
  });

  it('invalid header ends FAILED', async () => {
    const id = await postCsv('foo,bar\n1,2\n');

    await worker.processOnce();

    const upload = await getUpload(id);
    expect(upload.status).toBe('FAILED');
    expect(upload.errorMessage).toContain('Invalid CSV header');
    const results = await ctx.app.inject({ method: 'GET', url: `${API}/uploads/${id}/results` });
    expect(results.json<{ data: unknown[] }>().data).toEqual([]);
  });

  it('partial file ends COMPLETED with failedRows and rowErrors', async () => {
    const id = await postCsv(sampleWithErrorsCsv(), 'sample-with-errors.csv');

    await worker.processOnce();

    const upload = await getUpload(id);
    expect(upload.status).toBe('COMPLETED');
    expect(upload.processedRows).toBe(19);
    expect(upload.failedRows).toBe(6);
    expect(upload.rowErrors).toHaveLength(7);
  });

  it('missing object retries then dead-letters', async () => {
    const id = await postCsv([HEADER, ...validRows(2)].join('\n') + '\n');
    const key = [...ctx.storage.files.keys()][0];
    if (key === undefined) throw new Error('Expected a stored object');
    ctx.storage.files.delete(key);

    await worker.processOnce();
    ctx.queue.requeueInFlight();
    await worker.processOnce();
    ctx.queue.requeueInFlight();
    await worker.processOnce();

    const upload = await getUpload(id);
    expect(upload.status).toBe('FAILED');
    expect(upload.errorMessage).toContain('after 3 attempts');
    expect(ctx.queue.visibilityChanges.map((change) => change.timeoutSeconds)).toEqual([15, 30]);
    expect(ctx.queue.inFlightCount).toBe(1);
  });
});
