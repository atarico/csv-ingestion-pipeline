import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { MessagingError } from '../../../shared/domain/DomainError.js';
import { Either } from '../../../shared/domain/Either.js';
import type { IMessagePublisher } from '../../../shared/application/ports/IMessagePublisher.js';

export class SqsMessagePublisher implements IMessagePublisher {
  constructor(
    private readonly sqsClient: SQSClient,
    private readonly sqsQueueUrl: string,
  ) {}

  async publish<T extends object>(message: T): Promise<Either<MessagingError, void>> {
    try {
      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.sqsQueueUrl,
          MessageBody: JSON.stringify(message),
        }),
      );
      return Either.right(undefined);
    } catch (error) {
      return Either.left(new MessagingError('Could not publish message', error));
    }
  }
}
