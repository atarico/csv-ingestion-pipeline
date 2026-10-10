import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/domain/DomainError.js';
import { FileName } from './FileName.js';

describe('FileName', () => {
  it('accepts "data.csv" and "DATA.CSV"', () => {
    for (const raw of ['data.csv', 'DATA.CSV']) {
      const result = FileName.create(raw);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.value).toBe(raw);
    }
  });

  it('trims surrounding spaces', () => {
    const result = FileName.create('  data.csv  ');
    expect(result.isRight() && result.value.value).toBe('data.csv');
  });

  it('rejects non-string', () => {
    const result = FileName.create(42);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('fileName must be a string');
      expect(result.value.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects empty', () => {
    const result = FileName.create('   ');
    expect(result.isLeft() && result.value.message).toBe('fileName is required');
  });

  it('rejects 256 chars', () => {
    const tooLong = `${'a'.repeat(252)}.csv`;
    expect(tooLong).toHaveLength(256);
    const result = FileName.create(tooLong);
    expect(result.isLeft() && result.value.message).toBe('fileName must be at most 255 characters');
    expect(FileName.create(`${'a'.repeat(251)}.csv`).isRight()).toBe(true);
  });

  it('rejects "a/b.csv" and "a\\b.csv"', () => {
    for (const raw of ['a/b.csv', 'a\\b.csv']) {
      const result = FileName.create(raw);
      expect(result.isLeft() && result.value.message).toBe(
        'fileName must not contain path separators',
      );
    }
  });

  it('rejects control characters', () => {
    const result = FileName.create('data\u0000.csv');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('must not contain control characters');
      expect(result.value).toBeInstanceOf(ValidationError);
      expect(result.value instanceof ValidationError && result.value.fieldErrors[0]?.field).toBe(
        'fileName',
      );
    }
  });

  it('rejects "data.txt" with UnsupportedFileError', () => {
    const result = FileName.create('data.txt');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe('UNSUPPORTED_FILE');
  });

  it('toStorageKeySegment normalizes NFC and replaces spaces and non-ASCII', () => {
    const composed = FileName.create('mi archivo ñ.csv');
    const decomposed = FileName.create('mi archivo ñ.csv');
    expect(composed.isRight() && composed.value.toStorageKeySegment()).toBe('mi_archivo__.csv');
    expect(decomposed.isRight() && decomposed.value.toStorageKeySegment()).toBe('mi_archivo__.csv');
  });
});
