import { Either } from '../../../shared/domain/Either.js';
import { ValidationError } from '../../../shared/domain/DomainError.js';
import { ValueObject } from '../../../shared/domain/ValueObject.js';

export type UploadStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export const UPLOAD_STATUS_VALUES: readonly UploadStatusValue[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
];

const ALLOWED_TRANSITIONS: Readonly<Record<UploadStatusValue, readonly UploadStatusValue[]>> = {
  PENDING: ['PROCESSING', 'FAILED'],
  PROCESSING: ['PROCESSING', 'COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export class UploadStatus extends ValueObject<{ value: UploadStatusValue }> {
  static readonly PENDING = new UploadStatus('PENDING');
  static readonly PROCESSING = new UploadStatus('PROCESSING');
  static readonly COMPLETED = new UploadStatus('COMPLETED');
  static readonly FAILED = new UploadStatus('FAILED');

  private constructor(value: UploadStatusValue) {
    super({ value });
  }

  static fromValue(raw: string): Either<ValidationError, UploadStatus> {
    switch (raw) {
      case 'PENDING':
        return Either.right(UploadStatus.PENDING);
      case 'PROCESSING':
        return Either.right(UploadStatus.PROCESSING);
      case 'COMPLETED':
        return Either.right(UploadStatus.COMPLETED);
      case 'FAILED':
        return Either.right(UploadStatus.FAILED);
      default:
        return Either.left(
          new ValidationError(`Invalid upload status: ${raw}`, [
            { field: 'status', message: `must be one of ${UPLOAD_STATUS_VALUES.join(', ')}` },
          ]),
        );
    }
  }

  get value(): UploadStatusValue {
    return this.props.value;
  }

  isTerminal(): boolean {
    return this.value === 'COMPLETED' || this.value === 'FAILED';
  }

  canTransitionTo(next: UploadStatus): boolean {
    return ALLOWED_TRANSITIONS[this.value].includes(next.value);
  }
}
