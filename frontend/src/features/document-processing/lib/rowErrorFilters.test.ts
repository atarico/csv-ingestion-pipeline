import { describe, expect, it } from 'vitest';
import type { RowErrorDto } from '../types/upload.types';
import { countByField, filterByField, paginate } from './rowErrorFilters';

const error = (row: number, field?: string): RowErrorDto => ({ row, field, code: 'X', message: 'm' });

describe('countByField', () => {
  it('counts per field in column order, then unknown fields, then fieldless errors', () => {
    const errors = [error(1, 'date'), error(2, 'amount'), error(3, 'amount'), error(4), error(5, 'zeta'), error(6, 'category')];

    expect(countByField(errors)).toEqual([
      { field: 'category', count: 1 },
      { field: 'amount', count: 2 },
      { field: 'date', count: 1 },
      { field: 'zeta', count: 1 },
      { field: '', count: 1 },
    ]);
  });

  it('returns nothing for no errors', () => {
    expect(countByField([])).toEqual([]);
  });
});

describe('filterByField', () => {
  const errors = [error(1, 'amount'), error(2, 'unit'), error(3)];

  it('keeps everything when no field is selected', () => {
    expect(filterByField(errors, null)).toEqual(errors);
  });

  it('keeps only the selected field, with "" matching fieldless errors', () => {
    expect(filterByField(errors, 'unit')).toEqual([errors[1]]);
    expect(filterByField(errors, '')).toEqual([errors[2]]);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 7 }, (_, index) => index + 1);

  it('slices the requested page', () => {
    expect(paginate(items, 2, 3)).toEqual({ items: [4, 5, 6], page: 2, totalPages: 3 });
  });

  it('clamps the page into range and always reports at least one page', () => {
    expect(paginate(items, 9, 3).page).toBe(3);
    expect(paginate(items, 0, 3).page).toBe(1);
    expect(paginate([], 1, 3)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});
