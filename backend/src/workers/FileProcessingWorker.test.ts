import pino from 'pino';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import type { ProcessFileCommand } from '../document-processing/application/commands/objects/ProcessFileCommand.js';
import { createFileUploadedMessage } from '../document-processing/application/messages/FileUploadedMessage.js';
import type { ProcessFileResult } from '../document-processing/application/dtos/UploadDtos.js';
import { Upload } from '../document-processing/domain/entities/Upload.js';
import { FileName } from '../document-processing/domain/value-objects/FileName.js';
import type { ILogger } from '../shared/application/ports/ILogger.js';
import type { ReceivedMessage } from '../shared/application/ports/IMessageConsumer.js';
import {
  InvalidStateTransitionError,
  NotFoundError,
  StorageError,
  type DomainError,
} from '../shared/domain/DomainError.js';
import { Either } from '../shared/domain/Either.js';
import { InMemoryMessageQueue } from '../shared/infrastructure/testing/InMemoryMessageQueue.js';
import { InMemoryUploadRepository } from '../shared/infrastructure/testing/InMemoryUploadRepository.js';
import { FileProcessingWorker } from './FileProcessingWorker.js';
import type { WorkerPolicy } from './WorkerPolicy.js';

type ExecuteResult = Either<DomainError, ProcessFileResult>;

describe('FileProcessingWorker', () => {
  let queue: InMemoryMessageQueue;
  let uploads: InMemoryUploadRepository;
  let execute: ReturnType<typeof vi.fn<(command: ProcessFileCommand) => Promise<ExecuteResult>>>;
  let policy: WorkerPolicy;
  let sleep: ReturnType<typeof vi.fn<(ms: number) => Promise<void>>>;
  let worker: FileProcessingWorker;

  function build(logger: ILogger = pino({ level: 'silent' })): FileProcessingWorker {
    return new FileProcessingWorker(
      queue,
      { execute } as unknown as ProcessFileCommandHandler,
      uploads,
      logger,
      policy,
    );
  }

  async function seedUpload(): Promise<Upload> {
    const fileName = FileName.create('data.csv');
    if (fileName.isLeft()) throw fileName.value;
    const upload = Upload.create({ fileName: fileName.value, userId: 'user-123' });
    await uploads.save(upload);
    return upload;
  }

  async function publishFor(upload: Upload): Promise<void> {
    await queue.publish(createFileUploadedMessage(upload.id, upload.fileKey));
  }

  async function receiveOne(): Promise<ReceivedMessage> {
    const [message] = await queue.receive();
    if (message === undefined) throw new Error('Expected a message');
    return message;
  }

  function right(status: 'COMPLETED' | 'FAILED', uploadId: string): ExecuteResult {
    return Either.right({ uploadId, status, totalRows: 2, processedRows: 2, failedRows: 0 });
  }

  beforeEach(() => {
    queue = new InMemoryMessageQueue();
    uploads = new InMemoryUploadRepository();
    execute = vi.fn();
    sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    policy = {
      maxReceiveCount: 3,
      pollBackoffMaxMs: 30000,
      retryBackoffBaseSeconds: 15,
      retryBackoffMaxSeconds: 60,
      sqsQueueUrl: 'in-memory',
      random: () => 0,
      sleep,
    };
    worker = build();
  });

  it('deletes message on Right COMPLETED', async () => {
    const upload = await seedUpload();
    execute.mockResolvedValue(right('COMPLETED', upload.id));
    await publishFor(upload);

    const outcome = await worker.handleMessage(await receiveOne());

    expect(outcome).toBe('completed');
    expect(queue.inFlightCount).toBe(0);
    expect(execute).toHaveBeenCalledWith({ uploadId: upload.id, fileKey: upload.fileKey });
  });

  it('deletes message on Right FAILED', async () => {
    const upload = await seedUpload();
    execute.mockResolvedValue(right('FAILED', upload.id));
    await publishFor(upload);

    const outcome = await worker.handleMessage(await receiveOne());

    expect(outcome).toBe('failed');
    expect(queue.inFlightCount).toBe(0);
  });

  it('drops invalid payload', async () => {
    await queue.publish({ hello: 'world' });

    const outcome = await worker.handleMessage(await receiveOne());

    expect(outcome).toBe('dropped');
    expect(execute).not.toHaveBeenCalled();
    expect(queue.inFlightCount).toBe(0);
  });

  it('drops NotFound and InvalidStateTransition', async () => {
    const upload = await seedUpload();
    await publishFor(upload);
    await publishFor(upload);
    execute
      .mockResolvedValueOnce(Either.left(new NotFoundError('Upload', upload.id)))
      .mockResolvedValueOnce(
        Either.left(new InvalidStateTransitionError('COMPLETED', 'PROCESSING')),
      );
    const first = await receiveOne();
    const second = await receiveOne();

    expect(await worker.handleMessage(first)).toBe('dropped');
    expect(await worker.handleMessage(second)).toBe('dropped');
    expect(queue.inFlightCount).toBe(0);
  });

  it('keeps message and extends visibility on StorageError below max receive count', async () => {
    const upload = await seedUpload();
    execute.mockResolvedValue(Either.left(new StorageError('Object not found')));
    await publishFor(upload);

    const outcome = await worker.handleMessage(await receiveOne());

    expect(outcome).toBe('retry');
    expect(queue.inFlightCount).toBe(1);
    expect(uploads.uploads.get(upload.id)?.status.value).toBe('PENDING');
    expect(queue.lastVisibilityChange?.timeoutSeconds).toBe(15);
  });

  it('sets visibility to 15 then 30 on consecutive retries (random=0)', async () => {
    const upload = await seedUpload();
    execute.mockResolvedValue(Either.left(new StorageError('Object not found')));
    await publishFor(upload);

    await worker.handleMessage(await receiveOne());
    queue.requeueInFlight();
    await worker.handleMessage(await receiveOne());

    expect(queue.visibilityChanges.map((change) => change.timeoutSeconds)).toEqual([15, 30]);
  });

  it('retryDelaySeconds caps at retryBackoffMaxSeconds', () => {
    expect(worker.retryDelaySeconds(10)).toBe(60);
    expect(worker.retryDelaySeconds(1)).toBe(15);
    expect(worker.retryDelaySeconds(2)).toBe(30);
  });

  it('marks upload FAILED and keeps message at max receive count', async () => {
    const upload = await seedUpload();
    execute.mockResolvedValue(Either.left(new StorageError('Object not found')));
    await publishFor(upload);
    const message = { ...(await receiveOne()), receiveCount: 3 };

    const outcome = await worker.handleMessage(message);

    const stored = uploads.uploads.get(upload.id);
    expect(outcome).toBe('dead-lettered');
    expect(stored?.status.value).toBe('FAILED');
    expect(stored?.errorMessage).toContain('after 3 attempts');
    expect(queue.inFlightCount).toBe(1);
    expect(queue.visibilityChanges).toHaveLength(0);
  });

  it('keeps message when handler throws', async () => {
    const upload = await seedUpload();
    execute.mockRejectedValue(new Error('database down'));
    await publishFor(upload);

    const outcome = await worker.handleMessage(await receiveOne());

    expect(outcome).toBe('retry');
    expect(queue.inFlightCount).toBe(1);
    expect(queue.lastVisibilityChange?.timeoutSeconds).toBe(15);
  });

  it('processOnce handles every received message', async () => {
    queue = new InMemoryMessageQueue(2);
    worker = build();
    const first = await seedUpload();
    const second = await seedUpload();
    execute.mockImplementation((command) => Promise.resolve(right('COMPLETED', command.uploadId)));
    await publishFor(first);
    await publishFor(second);

    await worker.processOnce();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(queue.inFlightCount).toBe(0);
  });

  it('start logs Worker started with the queue url and stops after stop()', async () => {
    const info = vi.fn();
    const logger = { info, child: () => logger } as unknown as ILogger;
    worker = build(logger);
    vi.spyOn(queue, 'receive').mockImplementation(() => {
      worker.stop();
      return Promise.resolve([]);
    });

    await worker.start();

    expect(info).toHaveBeenCalledWith({ queueUrl: 'in-memory' }, 'Worker started');
  });

  it('backs off when receive throws', async () => {
    queue.failNextReceive = true;

    await worker.processOnce();

    expect(sleep).toHaveBeenCalledWith(500, expect.any(AbortSignal));
  });

  it('stop aborts a backoff sleep', async () => {
    vi.useFakeTimers();
    try {
      delete policy.sleep;
      worker = build();
      queue.failNextReceive = true;
      const started = worker.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(1);

      worker.stop();

      await expect(started).resolves.toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stop aborts an in-progress receive', async () => {
    vi.spyOn(queue, 'receive').mockImplementation(
      (signal?: AbortSignal) =>
        new Promise<ReceivedMessage[]>((resolve) => {
          signal?.addEventListener('abort', () => resolve([]), { once: true });
        }),
    );
    const started = worker.start();
    await Promise.resolve();

    worker.stop();

    await expect(started).resolves.toBeUndefined();
  });
});
