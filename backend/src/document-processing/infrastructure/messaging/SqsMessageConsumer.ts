import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import type {
  IMessageConsumer,
  ReceivedMessage,
} from '../../../shared/application/ports/IMessageConsumer.js';

export interface SqsConsumerOptions {
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
  maxMessages: number;
}

function safeJsonParse(raw: string | undefined): unknown {
  if (raw === undefined) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Transport failures propagate: the worker loop is the catch boundary. */
export class SqsMessageConsumer implements IMessageConsumer {
  constructor(
    private readonly sqsClient: SQSClient,
    private readonly sqsQueueUrl: string,
    private readonly sqsConsumerOptions: SqsConsumerOptions,
  ) {}

  async receive(): Promise<ReceivedMessage[]> {
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.sqsQueueUrl,
        MaxNumberOfMessages: this.sqsConsumerOptions.maxMessages,
        WaitTimeSeconds: this.sqsConsumerOptions.waitTimeSeconds,
        VisibilityTimeout: this.sqsConsumerOptions.visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ['ApproximateReceiveCount'],
      }),
    );

    const received: ReceivedMessage[] = [];
    for (const message of response.Messages ?? []) {
      // Messages without an id or receipt handle cannot be acknowledged: skip them.
      if (message.MessageId === undefined || message.ReceiptHandle === undefined) continue;
      received.push({
        id: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        body: safeJsonParse(message.Body),
        receiveCount: Number(message.Attributes?.['ApproximateReceiveCount'] ?? '1'),
      });
    }
    return received;
  }

  async delete(receiptHandle: string): Promise<void> {
    await this.sqsClient.send(
      new DeleteMessageCommand({ QueueUrl: this.sqsQueueUrl, ReceiptHandle: receiptHandle }),
    );
  }

  async changeVisibility(receiptHandle: string, timeoutSeconds: number): Promise<void> {
    await this.sqsClient.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.sqsQueueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: timeoutSeconds,
      }),
    );
  }
}
