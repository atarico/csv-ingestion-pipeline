import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE_BYTES, validateCsvFile } from './validateCsvFile';

const file = (name: string, content: string | ArrayBuffer = 'a') => new File([content], name, { type: 'text/csv' });

describe('validateCsvFile', () => {
  it('accepts a small .csv file', () => {
    expect(validateCsvFile(file('data.csv'))).toBeNull();
  });

  it('rejects a non-csv extension', () => {
    expect(validateCsvFile(file('data.txt'))).toBe('El archivo debe tener extensión .csv');
  });

  it('rejects a file over 5 MB', () => {
    expect(validateCsvFile(file('big.csv', new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1)))).toBe(
      'El archivo supera el tamaño máximo de 5 MB',
    );
  });

  it('rejects a 0-byte file', () => {
    expect(validateCsvFile(file('empty.csv', ''))).toBe('El archivo está vacío');
  });
});
