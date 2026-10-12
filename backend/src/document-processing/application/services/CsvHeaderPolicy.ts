import { Either } from '../../../shared/domain/Either.js';
import { CsvFormatError } from '../../../shared/domain/DomainError.js';

export const CSV_REQUIRED_COLUMNS = ['category', 'amount', 'unit', 'date'] as const;

/** Trims and lower-cases every header name. */
export function normalizeHeader(headers: string[]): string[] {
  return headers.map((header) => header.trim().toLowerCase());
}

/**
 * Pure rule: the normalized names must be exactly the set {category, amount, unit, date},
 * in any order, with no extra names and no duplicates.
 */
export function validateHeader(normalizedHeaders: string[]): Either<CsvFormatError, void> {
  const required: readonly string[] = CSV_REQUIRED_COLUMNS;
  const present = new Set(normalizedHeaders);
  const missing = required.filter((name) => !present.has(name));
  const unexpected = [...present].filter((name) => !required.includes(name));
  const duplicated = [...present].filter(
    (name) => normalizedHeaders.filter((header) => header === name).length > 1,
  );

  // An empty name would render as a blank slot in the list, so quote it.
  const render = (names: string[]): string =>
    names.map((name) => (name === '' ? '""' : name)).join(', ');

  const parts: string[] = [];
  if (missing.length > 0) parts.push(`missing [${render(missing)}]`);
  if (unexpected.length > 0) parts.push(`unexpected [${render(unexpected)}]`);
  if (duplicated.length > 0) parts.push(`duplicated columns: ${render(duplicated)}`);

  if (parts.length === 0) return Either.right(undefined);
  return Either.left(
    new CsvFormatError(`Invalid CSV header: ${parts.join(', ')}`, 'INVALID_HEADER', {
      expected: [...CSV_REQUIRED_COLUMNS],
      missing,
      unexpected,
      duplicated,
    }),
  );
}
