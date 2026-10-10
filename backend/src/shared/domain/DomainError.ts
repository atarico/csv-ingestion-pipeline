export interface FieldError {
  field: string;
  message: string;
}

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details: unknown;

  protected constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
  constructor(
    message: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(message, fieldErrors);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`);
  }
}

export class UnsupportedFileError extends DomainError {
  readonly code = 'UNSUPPORTED_FILE';
  readonly httpStatus = 400;
  constructor(message = 'Only .csv files are supported') {
    super(message);
  }
}

export class FileTooLargeError extends DomainError {
  readonly code = 'FILE_TOO_LARGE';
  readonly httpStatus = 413;
  constructor(sizeBytes: number, maxBytes: number) {
    super(`File size ${sizeBytes} exceeds the maximum of ${maxBytes} bytes`);
  }
}

export class StorageError extends DomainError {
  readonly code = 'STORAGE_ERROR';
  readonly httpStatus = 502;
  constructor(message: string, cause?: unknown) {
    super(message, cause instanceof Error ? cause.message : cause);
  }
}

export class MessagingError extends DomainError {
  readonly code = 'MESSAGING_ERROR';
  readonly httpStatus = 502;
  constructor(message: string, cause?: unknown) {
    super(message, cause instanceof Error ? cause.message : cause);
  }
}

export class CsvFormatError extends DomainError {
  readonly code = 'CSV_FORMAT_ERROR';
  readonly httpStatus = 422;
  constructor(message: string) {
    super(message);
  }
}
