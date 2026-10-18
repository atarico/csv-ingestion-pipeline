import type { RowErrorDto } from '../types/upload.types';

export const ERRORS_PAGE_SIZE = 25;

/** CSV columns in file order; unknown fields sort after them, fieldless errors last. */
const COLUMN_ORDER = ['category', 'amount', 'unit', 'date'];

export interface FieldCount {
  /** Column name; '' groups errors that carry no field. */
  field: string;
  count: number;
}

function rank(field: string): number {
  if (field === '') return Number.MAX_SAFE_INTEGER;
  const index = COLUMN_ORDER.indexOf(field);
  return index === -1 ? COLUMN_ORDER.length : index;
}

export function countByField(errors: RowErrorDto[]): FieldCount[] {
  const counts = new Map<string, number>();
  for (const error of errors) {
    const field = error.field ?? '';
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => rank(a.field) - rank(b.field) || a.field.localeCompare(b.field));
}

/** `field === null` means no filter. */
export function filterByField(errors: RowErrorDto[], field: string | null): RowErrorDto[] {
  return field === null ? errors : errors.filter((error) => (error.field ?? '') === field);
}

export function paginate<T>(items: T[], page: number, size: number): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(totalPages, Math.max(1, page));
  return { items: items.slice((current - 1) * size, current * size), page: current, totalPages };
}
