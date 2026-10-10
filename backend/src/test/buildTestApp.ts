import { asValue, type AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import pino from 'pino';
import { loadConfig } from '../config/index.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryMessageQueue } from '../shared/infrastructure/testing/InMemoryMessageQueue.js';
import { truncateAll } from './db.js';
import { buildApp } from '../main/App.js';
import { createAppContainer } from '../main/container.js';

export interface TestApp {
  app: FastifyInstance;
  container: AwilixContainer;
  storage: InMemoryFileStorage;
  queue: InMemoryMessageQueue;
  prisma: PrismaClient;
}

export interface BuildTestAppOptions {
  /** Overrides UPLOAD_MAX_FILE_SIZE_BYTES for this app only. */
  maxFileSizeBytes?: number;
}

/**
 * Builds the real Fastify app on the real container, replacing S3/SQS/logger with in-memory
 * doubles. ONE InMemoryMessageQueue serves as publisher AND consumer so worker tests can consume
 * what the API published.
 */
export async function buildTestApp(options: BuildTestAppOptions = {}): Promise<TestApp> {
  process.env['NODE_ENV'] = 'test';
  const previousLimit = process.env['UPLOAD_MAX_FILE_SIZE_BYTES'];
  if (options.maxFileSizeBytes !== undefined) {
    process.env['UPLOAD_MAX_FILE_SIZE_BYTES'] = String(options.maxFileSizeBytes);
  }
  const config = loadConfig();
  if (options.maxFileSizeBytes !== undefined) {
    if (previousLimit === undefined) delete process.env['UPLOAD_MAX_FILE_SIZE_BYTES'];
    else process.env['UPLOAD_MAX_FILE_SIZE_BYTES'] = previousLimit;
  }

  const container = createAppContainer(config);
  const storage = new InMemoryFileStorage();
  const queue = new InMemoryMessageQueue();
  container.register({
    fileStorage: asValue(storage),
    messagePublisher: asValue(queue),
    messageConsumer: asValue(queue),
    logger: asValue(pino({ level: 'silent' })),
  });
  const app = buildApp(container);
  await app.ready();
  return {
    app,
    container,
    storage,
    queue,
    prisma: container.resolve<PrismaClient>('prismaClient'),
  };
}

/** Empties the tables and the in-memory doubles between tests. */
export async function resetTestState(ctx: TestApp): Promise<void> {
  await truncateAll(ctx.prisma);
  ctx.storage.files.clear();
  ctx.queue.published.length = 0;
}

/** Statuses of every persisted upload, so presentation tests never touch the ORM directly. */
export async function persistedUploadStatuses(ctx: TestApp): Promise<string[]> {
  const rows = await ctx.prisma.upload.findMany({ select: { status: true } });
  return rows.map((row) => row.status);
}
