import type { ICommandHandler } from '../../../../shared/application/ICommandHandler.js';
import type { IFileStorage } from '../../../../shared/application/ports/IFileStorage.js';
import type { IMessagePublisher } from '../../../../shared/application/ports/IMessagePublisher.js';
import {
  FileTooLargeError,
  ValidationError,
  type DomainError,
} from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import { Upload } from '../../../domain/entities/Upload.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import type { CreateUploadResult } from '../../dtos/UploadDtos.js';
import { createFileUploadedMessage } from '../../messages/FileUploadedMessage.js';
import type { UploadPolicy } from '../../policies/UploadPolicy.js';
import type { CreateUploadCommand } from '../objects/CreateUploadCommand.js';

export class CreateUploadCommandHandler implements ICommandHandler<
  CreateUploadCommand,
  CreateUploadResult
> {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly fileStorage: IFileStorage,
    private readonly messagePublisher: IMessagePublisher,
    private readonly uploadPolicy: UploadPolicy,
  ) {}

  async execute(command: CreateUploadCommand): Promise<Either<DomainError, CreateUploadResult>> {
    const fileName = FileName.create(command.fileName);
    if (fileName.isLeft()) return Either.left(fileName.value);

    // mimeType is intentionally not validated: browsers send inconsistent values.
    if (command.size === 0) {
      return Either.left(
        new ValidationError('File is empty', [{ field: 'file', message: 'must not be empty' }]),
      );
    }
    if (command.size > this.uploadPolicy.maxFileSizeBytes) {
      return Either.left(new FileTooLargeError(command.size, this.uploadPolicy.maxFileSizeBytes));
    }

    const upload = Upload.create({ fileName: fileName.value, userId: command.userId });

    const stored = await this.fileStorage.upload(upload.fileKey, command.content, 'text/csv');
    if (stored.isLeft()) return Either.left(stored.value);

    await this.uploadRepository.save(upload);

    const published = await this.messagePublisher.publish(
      createFileUploadedMessage(upload.id, upload.fileKey),
    );
    if (published.isLeft()) {
      upload.fail('Could not enqueue file for processing');
      await this.uploadRepository.save(upload);
      return Either.left(published.value);
    }

    return Either.right({
      id: upload.id,
      status: upload.status.value,
      fileName: fileName.value.value,
      createdAt: upload.createdAt.toISOString(),
    });
  }
}
