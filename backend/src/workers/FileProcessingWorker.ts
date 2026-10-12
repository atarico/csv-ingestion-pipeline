import type { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { FileUploadedMessageSchema } from '../document-processing/application/messages/FileUploadedMessage.js';
import type { IUploadRepository } from '../document-processing/domain/repositories/IUploadRepository.js';
import type { ILogger } from '../shared/application/ports/ILogger.js';
import type {
  IMessageConsumer,
  ReceivedMessage,
} from '../shared/application/ports/IMessageConsumer.js';
import { InvalidStateTransitionError, NotFoundError } from '../shared/domain/DomainError.js';
import {
  ExponentialBackoff,
  sleep,
} from '../shared/infrastructure/resilience/ExponentialBackoff.js';
import type { WorkerPolicy } from './WorkerPolicy.js';

export type MessageOutcome = 'completed' | 'failed' | 'dropped' | 'retry' | 'dead-lettered';

interface MessageContext {
  messageId: string;
  uploadId: string;
  receiveCount: number;
}

/**
 * Long-polling SQS consumer. It acknowledges (deletes) only business outcomes; transient failures
 * keep the message and extend its visibility so SQS redelivers it later, and the queue's
 * RedrivePolicy moves it to the DLQ once receiveCount exceeds maxReceiveCount.
 * This class is the declared try/catch boundary of the worker process.
 */
export class FileProcessingWorker {
  private readonly pollBackoff: ExponentialBackoff;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly log: ILogger;
  private stopped = false;
  /** One per start(); stop() aborts it to cut the long poll and the backoff sleep short. */
  private abortController = new AbortController();

  constructor(
    private readonly messageConsumer: IMessageConsumer,
    private readonly processFileCommandHandler: ProcessFileCommandHandler,
    private readonly uploadRepository: IUploadRepository,
    private readonly logger: ILogger,
    private readonly workerPolicy: WorkerPolicy,
  ) {
    this.pollBackoff = new ExponentialBackoff({
      baseMs: 1000,
      factor: 2,
      maxMs: workerPolicy.pollBackoffMaxMs,
      random: workerPolicy.random,
    });
    this.sleep = workerPolicy.sleep ?? sleep;
    this.log = logger.child({ component: 'worker' });
  }

  /** Loops processOnce() until stop(); resolves after the in-flight cycle ends. */
  async start(): Promise<void> {
    this.abortController = new AbortController();
    this.log.info({ queueUrl: this.workerPolicy.sqsQueueUrl }, 'Worker started');
    while (!this.stopped) {
      await this.processOnce();
    }
  }

  /** An in-flight handleMessage is never aborted: it finishes, then the loop exits. */
  stop(): void {
    this.stopped = true;
    this.abortController.abort();
  }

  /** One receive cycle: receive, then handle every message sequentially. */
  async processOnce(): Promise<void> {
    const { signal } = this.abortController;
    let messages: ReceivedMessage[];
    try {
      messages = await this.messageConsumer.receive(signal);
      this.pollBackoff.reset();
    } catch (error) {
      const delayMs = this.pollBackoff.nextDelayMs();
      this.log.error({ err: error, delayMs }, 'Receive failed, backing off');
      await this.sleep(delayMs, signal);
      return;
    }
    for (const message of messages) {
      await this.handleMessage(message);
    }
  }

  async handleMessage(message: ReceivedMessage): Promise<MessageOutcome> {
    const startedAt = Date.now();
    const parsed = FileUploadedMessageSchema.safeParse(message.body);
    if (!parsed.success) {
      this.log.error({ messageId: message.id, body: message.body }, 'Invalid message payload');
      await this.deleteMessage(message, 'dropped');
      return 'dropped';
    }

    const { uploadId, fileKey } = parsed.data;
    const context: MessageContext = {
      messageId: message.id,
      uploadId,
      receiveCount: message.receiveCount,
    };

    let failure: unknown;
    try {
      const result = await this.processFileCommandHandler.execute({ uploadId, fileKey });
      if (result.isRight()) {
        const outcome = result.value.status === 'COMPLETED' ? 'completed' : 'failed';
        await this.deleteMessage(message, outcome);
        this.log.info(
          {
            ...context,
            status: result.value.status,
            totalRows: result.value.totalRows,
            processedRows: result.value.processedRows,
            failedRows: result.value.failedRows,
            durationMs: Date.now() - startedAt,
            outcome,
          },
          'Upload processed',
        );
        return outcome;
      }
      if (
        result.value instanceof NotFoundError ||
        result.value instanceof InvalidStateTransitionError
      ) {
        await this.deleteMessage(message, 'dropped');
        this.log.warn({ ...context, err: result.value, outcome: 'dropped' }, 'Message dropped');
        return 'dropped';
      }
      failure = result.value;
    } catch (error) {
      failure = error;
    }

    if (message.receiveCount >= this.workerPolicy.maxReceiveCount) {
      await this.markUploadFailed(context, failure);
      this.log.error(
        { ...context, err: failure, outcome: 'dead-lettered' },
        'Message dead-lettered',
      );
      return 'dead-lettered';
    }

    const retryInSeconds = this.retryDelaySeconds(message.receiveCount);
    try {
      await this.messageConsumer.changeVisibility(message.receiptHandle, retryInSeconds);
    } catch (error) {
      this.log.error({ ...context, err: error }, 'Could not change message visibility');
    }
    this.log.warn(
      { ...context, retryInSeconds, err: failure, outcome: 'retry' },
      'Processing failed, will retry',
    );
    return 'retry';
  }

  /** Pure: min(retryBackoffMaxSeconds, retryBackoffBaseSeconds * 2^(receiveCount - 1) + floor(random() * retryBackoffBaseSeconds)). */
  retryDelaySeconds(receiveCount: number): number {
    const { retryBackoffBaseSeconds, retryBackoffMaxSeconds } = this.workerPolicy;
    const random = this.workerPolicy.random ?? Math.random;
    return Math.min(
      retryBackoffMaxSeconds,
      retryBackoffBaseSeconds * 2 ** (receiveCount - 1) +
        Math.floor(random() * retryBackoffBaseSeconds),
    );
  }

  /** A failing delete is logged and the outcome is kept: SQS redelivers and the handler drops it. */
  private async deleteMessage(message: ReceivedMessage, outcome: MessageOutcome): Promise<void> {
    try {
      await this.messageConsumer.delete(message.receiptHandle);
    } catch (error) {
      this.log.error(
        { messageId: message.id, receiveCount: message.receiveCount, err: error, outcome },
        'Could not delete message',
      );
    }
  }

  /** Marks the upload FAILED before SQS moves the message to the DLQ. Failures are only logged. */
  private async markUploadFailed(context: MessageContext, failure: unknown): Promise<void> {
    const reason = failure instanceof Error ? failure.message : String(failure);
    try {
      const upload = await this.uploadRepository.findById(context.uploadId);
      if (upload === null || upload.status.isTerminal()) return;
      const failed = upload.fail({
        code: 'PROCESSING_ERROR',
        message: `Processing failed after ${context.receiveCount} attempts: ${reason}`,
      });
      if (failed.isLeft()) return;
      await this.uploadRepository.save(upload);
    } catch (error) {
      this.log.error({ ...context, err: error }, 'Could not mark upload as failed');
    }
  }
}
