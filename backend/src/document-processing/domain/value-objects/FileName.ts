import { Either } from '../../../shared/domain/Either.js';
import { UnsupportedFileError, ValidationError } from '../../../shared/domain/DomainError.js';
import { ValueObject } from '../../../shared/domain/ValueObject.js';

export class FileName extends ValueObject<{ value: string }> {
  static readonly MAX_LENGTH = 255;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: unknown): Either<ValidationError | UnsupportedFileError, FileName> {
    if (typeof raw !== 'string') {
      return Either.left(
        new ValidationError('fileName must be a string', [
          { field: 'fileName', message: 'must be a string' },
        ]),
      );
    }
    const value = raw.trim();
    if (value.length === 0) return FileName.invalid('fileName is required');
    if (value.length > FileName.MAX_LENGTH) {
      return FileName.invalid(`fileName must be at most ${FileName.MAX_LENGTH} characters`);
    }
    if (value.includes('/') || value.includes('\\')) {
      return FileName.invalid('fileName must not contain path separators');
    }
    if (!value.toLowerCase().endsWith('.csv')) return Either.left(new UnsupportedFileError());
    return Either.right(new FileName(value));
  }

  private static invalid(message: string): Either<ValidationError, never> {
    return Either.left(new ValidationError(message, [{ field: 'fileName', message }]));
  }

  get value(): string {
    return this.props.value;
  }

  /** Normalizes with value.normalize('NFC'), then replaces every character outside [A-Za-z0-9._-] with "_". */
  toStorageKeySegment(): string {
    return this.value.normalize('NFC').replace(/[^A-Za-z0-9._-]/g, '_');
  }
}
