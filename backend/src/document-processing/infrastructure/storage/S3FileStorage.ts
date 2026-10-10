import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { StorageError } from '../../../shared/domain/DomainError.js';
import { Either } from '../../../shared/domain/Either.js';
import type { IFileStorage } from '../../../shared/application/ports/IFileStorage.js';

export class S3FileStorage implements IFileStorage {
  constructor(
    private readonly s3Client: S3Client,
    private readonly s3Bucket: string,
  ) {}

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<Either<StorageError, void>> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return Either.right(undefined);
    } catch (error) {
      return Either.left(new StorageError(`Could not upload ${key}`, error));
    }
  }

  async download(key: string): Promise<Either<StorageError, Readable>> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.s3Bucket, Key: key }),
      );
      if (!(response.Body instanceof Readable)) {
        return Either.left(new StorageError(`Unexpected body type for ${key}`));
      }
      return Either.right(response.Body);
    } catch (error) {
      return Either.left(new StorageError(`Could not download ${key}`, error));
    }
  }
}
