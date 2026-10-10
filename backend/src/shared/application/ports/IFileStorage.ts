import type { Readable } from 'node:stream';
import type { Either } from '../../domain/Either.js';
import type { StorageError } from '../../domain/DomainError.js';
export interface IFileStorage {
  upload(key: string, body: Buffer, contentType: string): Promise<Either<StorageError, void>>;
  download(key: string): Promise<Either<StorageError, Readable>>;
}
