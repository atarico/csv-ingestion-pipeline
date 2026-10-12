import type { Readable } from 'node:stream';
import { parse, CsvError } from 'csv-parse';
import { Either } from '../../../shared/domain/Either.js';
import { CsvFormatError } from '../../../shared/domain/DomainError.js';
import type { CsvRecord, ICsvParser, OnRecord } from '../../application/ports/ICsvParser.js';
import { normalizeHeader, validateHeader } from '../../application/services/CsvHeaderPolicy.js';

export class CsvParseCsvParser implements ICsvParser {
  countDataRows(stream: Readable): Promise<Either<CsvFormatError, number>> {
    return this.consume(stream, async () => {});
  }

  async parse(
    stream: Readable,
    onRecord: OnRecord,
  ): Promise<Either<CsvFormatError, { dataRows: number }>> {
    const result = await this.consume(stream, onRecord);
    return result.isLeft() ? Either.left(result.value) : Either.right({ dataRows: result.value });
  }

  private async consume(
    stream: Readable,
    onRecord: OnRecord,
  ): Promise<Either<CsvFormatError, number>> {
    // Mutable holder: assignments inside the columns callback are not tracked by control-flow analysis.
    const state: { headerSeen: boolean; headerError: CsvFormatError | null } = {
      headerSeen: false,
      headerError: null,
    };
    const parser = parse({
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter: ',',
      columns: (header: string[]) => {
        state.headerSeen = true;
        const normalized = normalizeHeader(header);
        const result = validateHeader(normalized);
        if (result.isLeft()) {
          state.headerError = result.value;
          throw result.value; // aborts the stream
        }
        return normalized;
      },
    });
    stream.on('error', (error) => parser.destroy(error)); // propagate source errors

    try {
      let rowNumber = 0;
      for await (const record of stream.pipe(parser)) {
        rowNumber += 1;
        await onRecord(record as CsvRecord, rowNumber);
      }
      // csv-parse emits nothing for empty input, so the header flag is what detects it.
      if (!state.headerSeen) return Either.left(new CsvFormatError('CSV is empty', 'EMPTY_FILE'));
      return Either.right(rowNumber);
    } catch (error) {
      if (state.headerError !== null) return Either.left(state.headerError);
      if (error instanceof CsvError) {
        return Either.left(
          new CsvFormatError(`Malformed CSV: ${error.message}`, 'MALFORMED_CSV', {
            reason: error.message,
          }),
        );
      }
      throw error; // storage/stream failures are not CSV format errors
    } finally {
      // pipe() never closes the source when the parser stops early; release the S3 socket.
      if (!stream.destroyed) stream.destroy();
    }
  }
}
