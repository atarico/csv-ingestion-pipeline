import { beforeEach, describe, expect, it } from 'vitest';
import {
  FileTooLargeError,
  MessagingError,
  StorageError,
  UnsupportedFileError,
  ValidationError,
} from '../../../../shared/domain/DomainError.js';
import { InMemoryFileStorage } from '../../../../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryMessageQueue } from '../../../../shared/infrastructure/testing/InMemoryMessageQueue.js';
import { InMemoryUploadRepository } from '../../../../shared/infrastructure/testing/InMemoryUploadRepository.js';
import { FileUploadedMessageSchema } from '../../messages/FileUploadedMessage.js';
import type { CreateUploadCommand } from '../objects/CreateUploadCommand.js';
import { CreateUploadCommandHandler } from './CreateUploadCommandHandler.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function buildCommand(overrides: Partial<CreateUploadCommand> = {}): CreateUploadCommand {
  const content = Buffer.from('category,amount,unit,date\nenergy,10,kWh,2026-01-01\n');
  return {
    fileName: 'data.csv',
    content,
    mimeType: 'text/csv',
    size: content.length,
    userId: 'user-123',
    ...overrides,
  };
}

describe('CreateUploadCommandHandler', () => {
  let uploadRepository: InMemoryUploadRepository;
  let fileStorage: InMemoryFileStorage;
  let messageQueue: InMemoryMessageQueue;
  let handler: CreateUploadCommandHandler;

  beforeEach(() => {
    uploadRepository = new InMemoryUploadRepository();
    fileStorage = new InMemoryFileStorage();
    messageQueue = new InMemoryMessageQueue();
    handler = new CreateUploadCommandHandler(uploadRepository, fileStorage, messageQueue, {
      maxFileSizeBytes: 1024,
    });
  });

  it('creates upload, stores file, saves PENDING and publishes message', async () => {
    const result = await handler.execute(buildCommand());

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) return;
    expect(result.value.id).toMatch(UUID_PATTERN);
    expect(result.value.status).toBe('PENDING');
    expect(result.value.fileName).toBe('data.csv');
    expect(fileStorage.files.has(`uploads/${result.value.id}/data.csv`)).toBe(true);
    expect(uploadRepository.uploads.get(result.value.id)?.status.value).toBe('PENDING');
    expect(messageQueue.published).toHaveLength(1);
    const message = FileUploadedMessageSchema.parse(messageQueue.published[0]);
    expect(message.uploadId).toBe(result.value.id);
    expect(message.fileKey).toBe(`uploads/${result.value.id}/data.csv`);
  });

  it('rejects non-csv file name', async () => {
    const result = await handler.execute(buildCommand({ fileName: 'data.txt' }));

    expect(result.value).toBeInstanceOf(UnsupportedFileError);
    expect(fileStorage.files.size).toBe(0);
    expect(uploadRepository.uploads.size).toBe(0);
    expect(messageQueue.published).toHaveLength(0);
  });

  it('rejects empty file', async () => {
    const result = await handler.execute(buildCommand({ content: Buffer.alloc(0), size: 0 }));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });

  it('rejects file over limit', async () => {
    const result = await handler.execute(buildCommand({ size: 1025 }));

    expect(result.value).toBeInstanceOf(FileTooLargeError);
    expect(fileStorage.files.size).toBe(0);
  });

  it('returns StorageError and persists nothing when storage fails', async () => {
    fileStorage.failNextUpload = true;

    const result = await handler.execute(buildCommand());

    expect(result.value).toBeInstanceOf(StorageError);
    expect(uploadRepository.uploads.size).toBe(0);
    expect(messageQueue.published).toHaveLength(0);
  });

  it('marks upload FAILED when publish fails', async () => {
    messageQueue.failNextPublish = true;

    const result = await handler.execute(buildCommand());

    expect(result.value).toBeInstanceOf(MessagingError);
    const [saved] = [...uploadRepository.uploads.values()];
    expect(saved?.status.value).toBe('FAILED');
    expect(saved?.errorMessage).toBe('Could not enqueue file for processing');
  });
});
