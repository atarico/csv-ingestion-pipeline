import { config as loadEnv } from 'dotenv';
import convict from 'convict';
import type { AppConfig, IConvictProps } from './IConvictProps.js';

export interface LoadConfigOptions {
  /** Load `.env.${NODE_ENV}` and `.env` before validating. Default true; tests pass false. */
  envFiles?: boolean;
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  if (options.envFiles !== false) {
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';
    loadEnv({ path: `.env.${nodeEnv}` });
    loadEnv({ path: '.env' });
  }

  const schema = convict<IConvictProps>({
    env: { format: ['development', 'test', 'production'], default: 'development', env: 'NODE_ENV' },
    port: { format: 'port', default: 4000, env: 'PORT' },
    host: { format: String, default: '0.0.0.0', env: 'HOST' },
    logLevel: { format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'], default: 'info', env: 'LOG_LEVEL' },
    databaseUrl: { format: String, default: '', env: 'DATABASE_URL' },
    aws: {
      region: { format: String, default: 'us-east-1', env: 'AWS_REGION' },
      endpoint: { format: String, default: null, nullable: true, env: 'AWS_ENDPOINT' },
      accessKeyId: { format: String, default: 'test', env: 'AWS_ACCESS_KEY_ID' },
      secretAccessKey: { format: String, default: 'test', env: 'AWS_SECRET_ACCESS_KEY', sensitive: true },
      s3Bucket: { format: String, default: 'document-processing', env: 'S3_BUCKET' },
      s3ForcePathStyle: { format: Boolean, default: true, env: 'S3_FORCE_PATH_STYLE' },
      sqsQueueUrl: { format: String, default: '', env: 'SQS_QUEUE_URL' },
    },
    worker: {
      waitTimeSeconds: { format: 'nat', default: 20, env: 'WORKER_WAIT_TIME_SECONDS' },
      visibilityTimeoutSeconds: { format: 'nat', default: 60, env: 'WORKER_VISIBILITY_TIMEOUT_SECONDS' },
      maxMessages: { format: 'nat', default: 1, env: 'WORKER_MAX_MESSAGES' },
      maxReceiveCount: { format: 'nat', default: 3, env: 'WORKER_MAX_RECEIVE_COUNT' },
      pollBackoffMaxMs: { format: 'nat', default: 30000, env: 'WORKER_POLL_BACKOFF_MAX_MS' },
      retryBackoffBaseSeconds: { format: 'nat', default: 15, env: 'WORKER_RETRY_BACKOFF_BASE_SECONDS' },
      retryBackoffMaxSeconds: { format: 'nat', default: 60, env: 'WORKER_RETRY_BACKOFF_MAX_SECONDS' },
    },
    upload: {
      maxFileSizeBytes: { format: 'nat', default: 5 * 1024 * 1024, env: 'UPLOAD_MAX_FILE_SIZE_BYTES' },
    },
    defaultUserId: { format: String, default: 'user-123', env: 'DEFAULT_USER_ID' },
    corsOrigin: { format: String, default: 'http://localhost:3000', env: 'CORS_ORIGIN' },
  });

  schema.validate({ allowed: 'strict' });
  const config = schema.getProperties();
  if (config.databaseUrl === '') throw new Error('DATABASE_URL is required');
  if (config.aws.sqsQueueUrl === '') throw new Error('SQS_QUEUE_URL is required');
  if (config.aws.endpoint === '') return { ...config, aws: { ...config.aws, endpoint: null } };
  return config;
}
