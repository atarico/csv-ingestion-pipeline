import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

export interface AwsClientOptions {
  region: string;
  endpoint: string | null;
  /** Empty string means "use the SDK default credential chain" (e.g. the task IAM role). */
  accessKeyId: string;
  secretAccessKey: string;
  s3ForcePathStyle: boolean;
}

export interface AwsClientConfig {
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

/**
 * Pure builder shared by both clients. `credentials` is present only when both static keys are
 * set; `endpoint` only for a custom (LocalStack) endpoint; `forcePathStyle` only for S3.
 */
export function buildAwsClientConfig(options: AwsClientOptions, service: 's3' | 'sqs'): AwsClientConfig {
  const hasStaticKeys = options.accessKeyId !== '' && options.secretAccessKey !== '';
  return {
    region: options.region,
    ...(hasStaticKeys && {
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    }),
    ...(options.endpoint !== null && {
      endpoint: options.endpoint,
      ...(service === 's3' && { forcePathStyle: options.s3ForcePathStyle }),
    }),
  };
}

export function createS3Client(options: AwsClientOptions): S3Client {
  return new S3Client(buildAwsClientConfig(options, 's3'));
}

export function createSqsClient(options: AwsClientOptions): SQSClient {
  return new SQSClient(buildAwsClientConfig(options, 'sqs'));
}
