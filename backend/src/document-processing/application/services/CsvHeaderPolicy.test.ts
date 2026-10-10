import { describe, expect, it } from 'vitest';
import { normalizeHeader, validateHeader } from './CsvHeaderPolicy.js';

describe('CsvHeaderPolicy', () => {
  it('normalizeHeader trims and lower-cases', () => {
    expect(normalizeHeader([' Amount ', 'DATE'])).toEqual(['amount', 'date']);
  });

  it('accepts the exact set in any order', () => {
    expect(validateHeader(['date', 'unit', 'amount', 'category']).isRight()).toBe(true);
  });

  it('rejects missing column', () => {
    const result = validateHeader(['category', 'amount', 'unit']);
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: 'Invalid CSV header: missing [date]' });
  });

  it('rejects unexpected column', () => {
    const result = validateHeader(['category', 'amount', 'unit', 'date', 'notes']);
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: 'Invalid CSV header: unexpected [notes]' });
  });

  it('reports missing and unexpected together', () => {
    const result = validateHeader(['category', 'amount', 'unit', 'notes']);
    expect(result.value).toMatchObject({
      message: 'Invalid CSV header: missing [date], unexpected [notes]',
    });
  });

  it('rejects duplicated column with a non-empty message', () => {
    const result = validateHeader(['category', 'amount', 'amount', 'unit', 'date']);
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({
      message: 'Invalid CSV header: duplicated columns: amount',
    });
  });

  it('empty header lists every column as missing', () => {
    const result = validateHeader([]);
    expect(result.value).toMatchObject({
      message: 'Invalid CSV header: missing [category, amount, unit, date]',
    });
  });
});
