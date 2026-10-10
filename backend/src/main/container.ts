import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import type { AppConfig } from '../config/IConvictProps.js';
import type { UploadPolicy } from '../document-processing/application/policies/UploadPolicy.js';
import { registerDocumentProcessingModule } from '../document-processing/infrastructure/dependency-injection/DocumentProcessingModule.js';
import {
  SqsMessageConsumer,
  type SqsConsumerOptions,
} from '../document-processing/infrastructure/messaging/SqsMessageConsumer.js';
import { SqsMessagePublisher } from '../document-processing/infrastructure/messaging/SqsMessagePublisher.js';
import { createPrismaClient } from '../document-processing/infrastructure/persistence/PrismaClientFactory.js';
import { S3FileStorage } from '../document-processing/infrastructure/storage/S3FileStorage.js';
import { createS3Client, createSqsClient } from '../shared/infrastructure/aws/AwsClientsFactory.js';
import { createLogger } from '../shared/infrastructure/logging/createLogger.js';

export function createAppContainer(config: AppConfig): AwilixContainer {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC, strict: true });
  container.register({
    appConfig: asValue(config),
    defaultUserId: asValue(config.defaultUserId),
    uploadPolicy: asValue<UploadPolicy>({ maxFileSizeBytes: config.upload.maxFileSizeBytes }),
    s3Bucket: asValue(config.aws.s3Bucket),
    sqsQueueUrl: asValue(config.aws.sqsQueueUrl),
    sqsConsumerOptions: asValue<SqsConsumerOptions>({
      waitTimeSeconds: config.worker.waitTimeSeconds,
      visibilityTimeoutSeconds: config.worker.visibilityTimeoutSeconds,
      maxMessages: config.worker.maxMessages,
    }),
    logger: asValue(createLogger(config.logLevel, config.env)),
    prismaClient: asFunction(() => createPrismaClient(config.databaseUrl))
      .singleton()
      .disposer((client) => client.$disconnect()),
    s3Client: asFunction(() => createS3Client({ ...config.aws })).singleton(),
    sqsClient: asFunction(() => createSqsClient({ ...config.aws })).singleton(),
    fileStorage: asClass(S3FileStorage).singleton(),
    messagePublisher: asClass(SqsMessagePublisher).singleton(),
    messageConsumer: asClass(SqsMessageConsumer).singleton(),
  });
  registerDocumentProcessingModule(container);
  return container;
}
