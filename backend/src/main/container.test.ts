import pino from 'pino';
import { asValue } from 'awilix';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config/index.js';
import { CreateUploadCommandHandler } from '../document-processing/application/commands/handlers/CreateUploadCommandHandler.js';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { GetUploadResultsQueryHandler } from '../document-processing/application/queries/handlers/GetUploadResultsQueryHandler.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryMessageQueue } from '../shared/infrastructure/testing/InMemoryMessageQueue.js';
import { createAppContainer } from './container.js';

describe('createAppContainer', () => {
  const containers: Array<ReturnType<typeof createAppContainer>> = [];

  afterEach(async () => {
    await Promise.all(containers.splice(0).map((container) => container.dispose()));
  });

  function build(): ReturnType<typeof createAppContainer> {
    const container = createAppContainer(loadConfig());
    containers.push(container);
    return container;
  }

  it('resolves the command and query handlers with the real wiring', () => {
    const container = build();

    expect(container.resolve('createUploadCommandHandler')).toBeInstanceOf(
      CreateUploadCommandHandler,
    );
    expect(container.resolve('processFileCommandHandler')).toBeInstanceOf(
      ProcessFileCommandHandler,
    );
    expect(container.resolve('getUploadResultsQueryHandler')).toBeInstanceOf(
      GetUploadResultsQueryHandler,
    );
    expect(container.resolve('getUploadByIdQueryHandler')).toBeDefined();
    expect(container.resolve('listUploadsQueryHandler')).toBeDefined();
    expect(container.resolve('getUploadStatsQueryHandler')).toBeDefined();
  });

  it('returns singletons', () => {
    const container = build();

    expect(container.resolve('uploadRepository')).toBe(container.resolve('uploadRepository'));
  });

  it('allows overriding ports with in-memory doubles sharing one queue', () => {
    const container = build();
    const queue = new InMemoryMessageQueue();
    const storage = new InMemoryFileStorage();
    container.register({
      fileStorage: asValue(storage),
      messagePublisher: asValue(queue),
      messageConsumer: asValue(queue),
      logger: asValue(pino({ level: 'silent' })),
    });

    expect(container.resolve('messagePublisher')).toBe(container.resolve('messageConsumer'));
    expect(container.resolve('fileStorage')).toBe(storage);
    expect(container.resolve('createUploadCommandHandler')).toBeInstanceOf(
      CreateUploadCommandHandler,
    );
  });

  it('fails with the registration name when a dependency is missing (strict)', () => {
    const container = build();

    expect(() => container.resolve('doesNotExist')).toThrow(/doesNotExist/);
  });
});
