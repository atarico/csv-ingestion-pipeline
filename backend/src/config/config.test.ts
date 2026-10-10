import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

const MANAGED_KEYS = [
  'NODE_ENV',
  'PORT',
  'LOG_LEVEL',
  'DATABASE_URL',
  'SQS_QUEUE_URL',
  'AWS_ENDPOINT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'DEFAULT_USER_ID',
  'WORKER_RETRY_BACKOFF_BASE_SECONDS',
] as const;

describe('loadConfig', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = {};
    for (const key of MANAGED_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
    process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/test_db';
    process.env['SQS_QUEUE_URL'] = 'http://localhost:4566/000000000000/queue';
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      const value = snapshot[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('loads defaults when only required vars are set', () => {
    process.env['AWS_ENDPOINT'] = 'http://localhost:4566';

    const config = loadConfig({ envFiles: false });

    expect(config.port).toBe(4000);
    expect(config.defaultUserId).toBe('user-123');
    expect(config.worker.retryBackoffBaseSeconds).toBe(15);
    expect(config.aws.endpoint).toBe('http://localhost:4566');
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env['DATABASE_URL'];

    expect(() => loadConfig({ envFiles: false })).toThrow(/DATABASE_URL/);
  });

  it('throws when SQS_QUEUE_URL is missing', () => {
    delete process.env['SQS_QUEUE_URL'];

    expect(() => loadConfig({ envFiles: false })).toThrow(/SQS_QUEUE_URL/);
  });

  it('normalizes empty AWS_ENDPOINT to null', () => {
    process.env['AWS_ENDPOINT'] = '';

    const config = loadConfig({ envFiles: false });

    expect(config.aws.endpoint).toBeNull();
  });

  it('defaults the aws keys to empty so the default credential chain applies', () => {
    const config = loadConfig({ envFiles: false });

    expect(config.aws.accessKeyId).toBe('');
    expect(config.aws.secretAccessKey).toBe('');
  });

  it('rejects only one of the two aws keys', () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'test';

    expect(() => loadConfig({ envFiles: false })).toThrow(/AWS_ACCESS_KEY_ID.*AWS_SECRET_ACCESS_KEY/);
  });

  it('rejects an invalid LOG_LEVEL', () => {
    process.env['LOG_LEVEL'] = 'verbose';

    expect(() => loadConfig({ envFiles: false })).toThrow();
  });

  it('loads .env files by default', () => {
    process.env['NODE_ENV'] = 'test';
    delete process.env['DATABASE_URL'];
    delete process.env['SQS_QUEUE_URL'];

    const config = loadConfig();

    expect(config.databaseUrl).toBe(
      'postgresql://postgres:postgres@localhost:5432/document_processing_test',
    );
  });
});
