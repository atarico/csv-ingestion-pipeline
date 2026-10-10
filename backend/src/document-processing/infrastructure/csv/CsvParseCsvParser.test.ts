import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { CsvFormatError } from '../../../shared/domain/DomainError.js';
import type { CsvRecord } from '../../application/ports/ICsvParser.js';
import { CsvParseCsvParser } from './CsvParseCsvParser.js';

const HEADER = 'category,amount,unit,date';
const BOM = String.fromCharCode(0xfeff);

function streamOf(text: string): Readable {
  return Readable.from([Buffer.from(text, 'utf8')]);
}

async function collect(text: string): Promise<Array<{ record: CsvRecord; rowNumber: number }>> {
  const collected: Array<{ record: CsvRecord; rowNumber: number }> = [];
  const result = await new CsvParseCsvParser().parse(streamOf(text), (record, rowNumber) => {
    collected.push({ record, rowNumber });
    return Promise.resolve();
  });
  if (result.isLeft()) throw result.value;
  return collected;
}

describe('CsvParseCsvParser', () => {
  const parser = new CsvParseCsvParser();

  it('countDataRows counts rows for a valid header', async () => {
    const rows = Array.from({ length: 5 }, () => 'energy,10.5,kWh,2026-01-15');
    const result = await parser.countDataRows(streamOf([HEADER, ...rows].join('\n')));

    expect(result.isRight() && result.value).toBe(5);
  });

  it('accepts a header in any order and case', async () => {
    const result = await parser.countDataRows(
      streamOf('DATE,unit, Amount ,category\n2026-01-15,kWh,10,energy\n'),
    );

    expect(result.isRight() && result.value).toBe(1);
  });

  it('strips the BOM', async () => {
    const result = await parser.countDataRows(
      streamOf(`${BOM}${HEADER}\nenergy,10,kWh,2026-01-15\n`),
    );

    expect(result.isRight() && result.value).toBe(1);
  });

  it('rejects a missing column', async () => {
    const result = await parser.countDataRows(streamOf('category,amount,unit\nenergy,10,kWh\n'));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(CsvFormatError);
    expect((result.value as CsvFormatError).message).toBe('Invalid CSV header: missing [date]');
  });

  it('rejects an unexpected column', async () => {
    const result = await parser.countDataRows(streamOf(`${HEADER},notes\n`));

    expect(result.isLeft()).toBe(true);
    expect((result.value as CsvFormatError).message).toContain('unexpected [notes]');
  });

  it('rejects a duplicated column with a non-empty message', async () => {
    const result = await parser.countDataRows(streamOf('category,category,amount,unit,date\n'));

    expect(result.isLeft()).toBe(true);
    expect((result.value as CsvFormatError).message).toBe(
      'Invalid CSV header: duplicated columns: category',
    );
  });

  it('reports empty input as "CSV is empty"', async () => {
    const result = await parser.countDataRows(streamOf(''));

    expect(result.isLeft()).toBe(true);
    expect((result.value as CsvFormatError).message).toBe('CSV is empty');
  });

  it('yields zero rows for a header-only file', async () => {
    const result = await parser.countDataRows(streamOf(`${HEADER}\n`));

    expect(result.isRight() && result.value).toBe(0);
  });

  it('parse passes normalized records and 1-based rowNumber', async () => {
    const collected = await collect(
      `${HEADER}\nElectricity,150.5,kWh,2024-01-15\nWaste,45.8,kg,2024-01-16\n`,
    );

    expect(collected[0]).toEqual({
      record: { category: 'Electricity', amount: '150.5', unit: 'kWh', date: '2024-01-15' },
      rowNumber: 1,
    });
    expect(collected[1]?.rowNumber).toBe(2);
  });

  it('parse reports the number of data rows', async () => {
    const result = await parser.parse(streamOf(`${HEADER}\nWaste,45.8,kg,2024-01-16\n`), () =>
      Promise.resolve(),
    );

    expect(result.isRight() && result.value).toEqual({ dataRows: 1 });
  });

  it('parse handles quoted fields with commas', async () => {
    const collected = await collect(`${HEADER}\n"Natural, Gas",12,m3,2024-02-01\n`);

    expect(collected[0]?.record.category).toBe('Natural, Gas');
  });

  it('short rows yield undefined fields', async () => {
    const collected = await collect(`${HEADER}\nWaste,45.8\n`);

    expect(collected[0]?.record.unit).toBeUndefined();
    expect(collected[0]?.record.date).toBeUndefined();
  });

  it('skips empty lines', async () => {
    const collected = await collect(
      `${HEADER}\n\nWaste,1,kg,2024-01-01\n\n\nWaste,2,kg,2024-01-02\n`,
    );

    expect(collected.map((entry) => entry.rowNumber)).toEqual([1, 2]);
  });

  it('treats a malformed quoted field as a CsvFormatError', async () => {
    const result = await parser.countDataRows(streamOf(`${HEADER}\n"Waste,1,kg,2024-01-01\n`));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(CsvFormatError);
    expect((result.value as CsvFormatError).message.startsWith('Malformed CSV')).toBe(true);
  });

  it('rethrows source stream errors instead of returning a Left', async () => {
    const failing = new Readable({
      read() {
        this.push(`${HEADER}\n`);
        this.destroy(new Error('socket reset'));
      },
    });

    await expect(parser.countDataRows(failing)).rejects.toThrow('socket reset');
  });

  describe('source stream release', () => {
    // Chunks arrive on separate ticks so the source is still open when parsing stops early.
    function chunkedSource(header: string, rows: number): Readable {
      async function* chunks(): AsyncGenerator<Buffer> {
        yield Buffer.from(`${header}\n`, 'utf8');
        for (let i = 0; i < rows; i += 1) {
          await new Promise((resolve) => setImmediate(resolve));
          yield Buffer.from('energy,10,kWh,2026-01-15\n', 'utf8');
        }
      }
      return Readable.from(chunks());
    }

    it('destroys the source stream after an invalid header', async () => {
      const source = chunkedSource('category,amount,unit', 50);

      const result = await parser.countDataRows(source);

      expect(result.isLeft()).toBe(true);
      expect(source.destroyed).toBe(true);
    });

    it('destroys the source stream when onRecord throws', async () => {
      const source = chunkedSource(HEADER, 50);

      await expect(
        parser.parse(source, (_record, rowNumber) =>
          rowNumber === 2 ? Promise.reject(new Error('db down')) : Promise.resolve(),
        ),
      ).rejects.toThrow('db down');

      expect(source.destroyed).toBe(true);
    });

    it('destroys the source stream after a successful parse', async () => {
      const source = chunkedSource(HEADER, 3);

      const result = await parser.countDataRows(source);

      expect(result.isRight() && result.value).toBe(3);
      expect(source.destroyed).toBe(true);
    });
  });
});
