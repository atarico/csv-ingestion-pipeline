import { Readable } from 'node:stream';
import { Either } from '../../domain/Either.js';
import { StorageError } from '../../domain/DomainError.js';
import type { IFileStorage } from '../../application/ports/IFileStorage.js';

export class InMemoryFileStorage implements IFileStorage {
  readonly files = new Map<string, Buffer>();
  /** When true, the next upload returns Left(StorageError) and the flag resets. */
  failNextUpload = false;
  /** When true, the next download returns Left(StorageError) and the flag resets. */
  failNextDownload = false;
  /** 1-based index of the download call that returns Left(StorageError); resets once it fires. */
  failDownloadAt: number | undefined = undefined;
  private downloadCalls = 0;

  upload(key: string, body: Buffer): Promise<Either<StorageError, void>> {
    if (this.failNextUpload) {
      this.failNextUpload = false;
      return Promise.resolve(Either.left(new StorageError(`Could not upload object: ${key}`)));
    }
    this.files.set(key, body);
    return Promise.resolve(Either.right(undefined));
  }

  download(key: string): Promise<Either<StorageError, Readable>> {
    if (this.failDownloadAt !== undefined) {
      this.downloadCalls += 1;
      if (this.downloadCalls === this.failDownloadAt) {
        this.failDownloadAt = undefined;
        this.downloadCalls = 0;
        return Promise.resolve(Either.left(new StorageError(`Could not download object: ${key}`)));
      }
    }
    if (this.failNextDownload) {
      this.failNextDownload = false;
      return Promise.resolve(Either.left(new StorageError(`Could not download object: ${key}`)));
    }
    const buffer = this.files.get(key);
    if (buffer === undefined)
      return Promise.resolve(Either.left(new StorageError(`Object not found: ${key}`)));
    return Promise.resolve(Either.right(Readable.from([buffer])));
  }
}
