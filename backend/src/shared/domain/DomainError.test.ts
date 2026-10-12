import { describe, expect, it } from 'vitest';
import {
  CsvFormatError,
  DomainError,
  FileTooLargeError,
  InvalidStateTransitionError,
  MessagingError,
  NotFoundError,
  StorageError,
  UnsupportedFileError,
  ValidationError,
} from './DomainError.js';

describe('DomainError hierarchy', () => {
  it('ValidationError maps to 400', () => {
    const error = new ValidationError('Invalid request');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.httpStatus).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid request');
  });

  it('NotFoundError formats resource and id', () => {
    const error = new NotFoundError('Upload', 'abc');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.httpStatus).toBe(404);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Upload abc not found');
  });

  it('InvalidStateTransitionError formats the transition', () => {
    const error = new InvalidStateTransitionError('PENDING', 'COMPLETED');
    expect(error.code).toBe('INVALID_STATE_TRANSITION');
    expect(error.httpStatus).toBe(409);
    expect(error.name).toBe('InvalidStateTransitionError');
    expect(error.message).toBe('Cannot transition from PENDING to COMPLETED');
  });

  it('UnsupportedFileError has a default message', () => {
    const error = new UnsupportedFileError();
    expect(error.code).toBe('UNSUPPORTED_FILE');
    expect(error.httpStatus).toBe(400);
    expect(error.name).toBe('UnsupportedFileError');
    expect(error.message).toBe('Only .csv files are supported');
  });

  it('FileTooLargeError formats sizes', () => {
    const error = new FileTooLargeError(10, 5);
    expect(error.code).toBe('FILE_TOO_LARGE');
    expect(error.httpStatus).toBe(413);
    expect(error.name).toBe('FileTooLargeError');
    expect(error.message).toBe('File size 10 exceeds the maximum of 5 bytes');
  });

  it('StorageError maps to 502', () => {
    const error = new StorageError('upload failed');
    expect(error.code).toBe('STORAGE_ERROR');
    expect(error.httpStatus).toBe(502);
    expect(error.name).toBe('StorageError');
    expect(error.message).toBe('upload failed');
    expect(error.details).toBeUndefined();
  });

  it('MessagingError maps to 502', () => {
    const error = new MessagingError('publish failed');
    expect(error.code).toBe('MESSAGING_ERROR');
    expect(error.httpStatus).toBe(502);
    expect(error.name).toBe('MessagingError');
    expect(error.message).toBe('publish failed');
  });

  it('CsvFormatError maps to 422', () => {
    const error = new CsvFormatError('bad header', 'INVALID_HEADER', { missing: ['date'] });
    expect(error.code).toBe('CSV_FORMAT_ERROR');
    expect(error.failureCode).toBe('INVALID_HEADER');
    expect(error.failureDetails).toEqual({ missing: ['date'] });
    expect(error.httpStatus).toBe(422);
    expect(error.name).toBe('CsvFormatError');
    expect(error.message).toBe('bad header');
  });

  it('ValidationError exposes fieldErrors as details', () => {
    const fieldErrors = [{ field: 'limit', message: 'too big' }];
    const error = new ValidationError('Invalid request', fieldErrors);
    expect(error.fieldErrors).toBe(fieldErrors);
    expect(error.details).toBe(fieldErrors);
  });

  it('StorageError flattens an Error cause to its message', () => {
    expect(new StorageError('failed', new Error('boom')).details).toBe('boom');
    expect(new MessagingError('failed', new Error('boom')).details).toBe('boom');
  });
});
