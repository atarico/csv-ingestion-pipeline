import { randomUUID } from 'node:crypto';
import { Either } from '../../domain/Either.js';
import { MessagingError } from '../../domain/DomainError.js';
import type {
  IMessageConsumer,
  ReceivedMessage,
} from '../../application/ports/IMessageConsumer.js';
import type { IMessagePublisher } from '../../application/ports/IMessagePublisher.js';

export class InMemoryMessageQueue implements IMessagePublisher, IMessageConsumer {
  /** Every message ever published. */
  readonly published: object[] = [];
  readonly visibilityChanges: Array<{ receiptHandle: string; timeoutSeconds: number }> = [];
  failNextPublish = false;
  /** When true, receive() throws once. */
  failNextReceive = false;

  private pending: ReceivedMessage[] = [];
  private readonly inFlight = new Map<string, ReceivedMessage>();

  constructor(private readonly maxMessages = 1) {}

  publish<T extends object>(message: T): Promise<Either<MessagingError, void>> {
    if (this.failNextPublish) {
      this.failNextPublish = false;
      return Promise.resolve(Either.left(new MessagingError('Could not publish message')));
    }
    this.published.push(message);
    this.pending.push({
      id: randomUUID(),
      receiptHandle: randomUUID(),
      body: message,
      receiveCount: 0,
    });
    return Promise.resolve(Either.right(undefined));
  }

  receive(): Promise<ReceivedMessage[]> {
    if (this.failNextReceive) {
      this.failNextReceive = false;
      return Promise.reject(new Error('Simulated receive failure'));
    }
    const taken = this.pending.splice(0, this.maxMessages);
    for (const message of taken) {
      message.receiveCount += 1;
      this.inFlight.set(message.receiptHandle, message);
    }
    return Promise.resolve(taken.map((message) => ({ ...message })));
  }

  delete(receiptHandle: string): Promise<void> {
    this.inFlight.delete(receiptHandle);
    return Promise.resolve();
  }

  changeVisibility(receiptHandle: string, timeoutSeconds: number): Promise<void> {
    this.visibilityChanges.push({ receiptHandle, timeoutSeconds });
    return Promise.resolve();
  }

  /** Simulates visibility timeout expiry: in-flight messages become pending again. */
  requeueInFlight(): void {
    this.pending.push(...this.inFlight.values());
    this.inFlight.clear();
  }

  get lastVisibilityChange(): { receiptHandle: string; timeoutSeconds: number } | null {
    return this.visibilityChanges.at(-1) ?? null;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  get inFlightCount(): number {
    return this.inFlight.size;
  }
}
