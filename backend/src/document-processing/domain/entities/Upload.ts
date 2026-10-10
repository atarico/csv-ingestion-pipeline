import {
  InvalidStateTransitionError,
  ValidationError,
} from '../../../shared/domain/DomainError.js';
import { AggregateRoot } from '../../../shared/domain/AggregateRoot.js';
import { Either } from '../../../shared/domain/Either.js';
import { UniqueId } from '../../../shared/domain/UniqueId.js';
import type { FileName } from '../value-objects/FileName.js';
import { UploadStatus } from '../value-objects/UploadStatus.js';
import { MAX_STORED_ROW_ERRORS, type RowError } from './RowError.js';

export interface UploadProps {
  fileName: FileName;
  fileKey: string;
  status: UploadStatus;
  userId: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  rowErrors: RowError[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompleteUploadInput {
  processedRows: number;
  failedRows: number;
  rowErrors: RowError[];
}

export interface FailureCounts {
  processedRows: number;
  failedRows: number;
  rowErrors: RowError[];
}

export class Upload extends AggregateRoot<UploadProps> {
  static create(input: { fileName: FileName; userId: string }): Upload {
    const id = UniqueId.generate();
    const now = new Date();
    return new Upload(id, {
      fileName: input.fileName,
      fileKey: `uploads/${id}/${input.fileName.toStorageKeySegment()}`,
      status: UploadStatus.PENDING,
      userId: input.userId,
      totalRows: null,
      processedRows: null,
      failedRows: null,
      errorMessage: null,
      rowErrors: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(id: string, props: UploadProps): Upload {
    return new Upload(id, props);
  }

  startProcessing(totalRows: number): Either<InvalidStateTransitionError, void> {
    if (!Number.isInteger(totalRows) || totalRows < 0) {
      throw new RangeError(`totalRows must be a non-negative integer, received ${totalRows}`);
    }
    const guard = this.guardTransition(UploadStatus.PROCESSING);
    if (guard) return guard;

    this.props.status = UploadStatus.PROCESSING;
    this.props.totalRows = totalRows;
    this.props.processedRows = 0;
    this.props.failedRows = 0;
    this.props.rowErrors = [];
    this.props.errorMessage = null;
    this.touch();
    return Either.right(undefined);
  }

  recordProgress(
    processedRows: number,
    failedRows: number,
  ): Either<InvalidStateTransitionError, void> {
    if (this.props.status !== UploadStatus.PROCESSING) {
      return Either.left(
        new InvalidStateTransitionError(this.props.status.value, UploadStatus.PROCESSING.value),
      );
    }
    this.props.processedRows = processedRows;
    this.props.failedRows = failedRows;
    this.touch();
    return Either.right(undefined);
  }

  complete(
    input: CompleteUploadInput,
  ): Either<InvalidStateTransitionError | ValidationError, void> {
    const guard = this.guardTransition(UploadStatus.COMPLETED);
    if (guard) return guard;
    if (input.processedRows < 1) {
      return Either.left(new ValidationError('An upload cannot complete with zero valid rows'));
    }

    this.props.status = UploadStatus.COMPLETED;
    this.props.processedRows = input.processedRows;
    this.props.failedRows = input.failedRows;
    this.props.totalRows = input.processedRows + input.failedRows;
    this.props.rowErrors = input.rowErrors.slice(0, MAX_STORED_ROW_ERRORS);
    this.props.errorMessage = null;
    this.touch();
    return Either.right(undefined);
  }

  fail(errorMessage: string, counts?: FailureCounts): Either<InvalidStateTransitionError, void> {
    const guard = this.guardTransition(UploadStatus.FAILED);
    if (guard) return guard;

    this.props.status = UploadStatus.FAILED;
    this.props.errorMessage = errorMessage;
    if (counts) {
      this.props.processedRows = counts.processedRows;
      this.props.failedRows = counts.failedRows;
      this.props.rowErrors = counts.rowErrors.slice(0, MAX_STORED_ROW_ERRORS);
      this.props.totalRows ??= counts.processedRows + counts.failedRows;
    }
    this.touch();
    return Either.right(undefined);
  }

  get fileName(): FileName {
    return this.props.fileName;
  }
  get fileKey(): string {
    return this.props.fileKey;
  }
  get status(): UploadStatus {
    return this.props.status;
  }
  get userId(): string {
    return this.props.userId;
  }
  get totalRows(): number | null {
    return this.props.totalRows;
  }
  get processedRows(): number | null {
    return this.props.processedRows;
  }
  get failedRows(): number | null {
    return this.props.failedRows;
  }
  get errorMessage(): string | null {
    return this.props.errorMessage;
  }
  get rowErrors(): readonly RowError[] {
    return this.props.rowErrors;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Returns a Left when the transition is forbidden, otherwise undefined. */
  private guardTransition(
    next: UploadStatus,
  ): Either<InvalidStateTransitionError, never> | undefined {
    if (this.props.status.canTransitionTo(next)) return undefined;
    return Either.left(new InvalidStateTransitionError(this.props.status.value, next.value));
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
