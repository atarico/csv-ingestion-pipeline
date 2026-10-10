import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

export interface AwsClientOptions {
  region: string;
  endpoint: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  s3ForcePathStyle: boolean;
}

export function createS3Client(options: AwsClientOptions): S3Client {
  return new S3Client({
    region: options.region,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    ...(options.endpoint !== null && {
      endpoint: options.endpoint,
      forcePathStyle: options.s3ForcePathStyle,
    }),
  });
}

export function createSqsClient(options: AwsClientOptions): SQSClient {
  return new SQSClient({
    region: options.region,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    ...(options.endpoint !== null && { endpoint: options.endpoint }),
  });
}
