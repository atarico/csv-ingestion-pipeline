export type NodeEnv = 'development' | 'test' | 'production';

export interface IConvictProps {
  env: NodeEnv;
  port: number;
  host: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  databaseUrl: string;
  aws: {
    region: string;
    endpoint: string | null;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
    s3ForcePathStyle: boolean;
    sqsQueueUrl: string;
  };
  worker: {
    waitTimeSeconds: number;
    visibilityTimeoutSeconds: number;
    maxMessages: number;
    maxReceiveCount: number;
    pollBackoffMaxMs: number;
    retryBackoffBaseSeconds: number;
    retryBackoffMaxSeconds: number;
  };
  upload: {
    maxFileSizeBytes: number;
  };
  defaultUserId: string;
  corsOrigin: string;
}

export type AppConfig = Readonly<IConvictProps>;
