import type { Readable } from 'node:stream';
import type { Either } from '../../../shared/domain/Either.js';
import type { CsvFormatError } from '../../../shared/domain/DomainError.js';

export type CsvRecord = Record<string, string | undefined>;
export type OnRecord = (record: CsvRecord, rowNumber: number) => Promise<void>;

export interface ICsvParser {
  /** Validates the header and counts data rows without materializing them. */
  countDataRows(stream: Readable): Promise<Either<CsvFormatError, number>>;
  /** Validates the header and streams every data row to onRecord (rowNumber starts at 1). */
  parse(
    stream: Readable,
    onRecord: OnRecord,
  ): Promise<Either<CsvFormatError, { dataRows: number }>>;
}
