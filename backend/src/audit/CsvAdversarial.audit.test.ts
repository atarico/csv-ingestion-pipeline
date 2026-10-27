/**
 * CSV ingestion audit: characterization tests through the real handler and parser.
 * "BUG"/"RISK" tests pin current behaviour that is likely unwanted; "OK" tests pin guarantees.
 */
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { Upload } from '../document-processing/domain/entities/Upload.js';
import { FileName } from '../document-processing/domain/value-objects/FileName.js';
import { CsvParseCsvParser } from '../document-processing/infrastructure/csv/CsvParseCsvParser.js';
import { InMemoryActivityDataRepository } from '../shared/infrastructure/testing/InMemoryActivityDataRepository.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryUploadRepository } from '../shared/infrastructure/testing/InMemoryUploadRepository.js';

const HEADER = 'category,amount,unit,date\n';
const OK_ROW = 'Electricity,10,kWh,2024-01-01\n';

async function ingest(content: Buffer | string) {
  const storage = new InMemoryFileStorage();
  const uploads = new InMemoryUploadRepository();
  const rows = new InMemoryActivityDataRepository();
  const name = FileName.create('data.csv');
  if (name.isLeft()) throw name.value;
  const upload = Upload.create({ fileName: name.value, userId: 'user-123' });
  storage.files.set(upload.fileKey, Buffer.isBuffer(content) ? content : Buffer.from(content));
  await uploads.save(upload);
  const handler = new ProcessFileCommandHandler(
    uploads,
    rows,
    storage,
    new CsvParseCsvParser(),
    pino({ level: 'silent' }),
  );
  await handler.execute({ uploadId: upload.id, fileKey: upload.fileKey });
  const saved = await uploads.findById(upload.id);
  const stored = await rows.findByUploadId(upload.id, { page: 1, limit: 100 });
  return {
    status: saved?.status.value,
    errorCode: saved?.errorCode,
    processedRows: saved?.processedRows,
    failedRows: saved?.failedRows,
    categories: stored.items.map((row) => row.category.value),
  };
}

describe('CSV adversarial inputs', () => {
  it('OK: BOM, CRLF, CR-only and mixed line endings are all accepted', async () => {
    for (const content of [
      '﻿' + HEADER + OK_ROW,
      (HEADER + OK_ROW).replaceAll('\n', '\r\n'),
      (HEADER + OK_ROW).replaceAll('\n', '\r'),
      HEADER + OK_ROW.replace('\n', '\r\n') + OK_ROW,
    ]) {
      expect((await ingest(content)).status).toBe('COMPLETED');
    }
  });

  it('BUG: invalid UTF-8 is silently replaced with U+FFFD and stored as a valid row', async () => {
    const latin1 = Buffer.concat([
      Buffer.from(HEADER + 'Calefacci'),
      Buffer.from([0xf3]), // "ó" in Windows-1252 / Latin-1, e.g. a CSV saved by Excel in Spanish
      Buffer.from('n,10,kWh,2024-01-01\n'),
    ]);
    const result = await ingest(latin1);
    expect(result).toMatchObject({ status: 'COMPLETED', processedRows: 1, failedRows: 0 });
    expect(result.categories).toEqual(['Calefacci�n']);
  });

  it('BUG: extra fields in a data row are dropped without any row error', async () => {
    const result = await ingest(HEADER + 'Electricity,10,kWh,2024-01-01,UNEXPECTED\n');
    expect(result).toMatchObject({ status: 'COMPLETED', processedRows: 1, failedRows: 0 });
  });

  it('RISK: a single stray quote fails the whole file, discarding every valid row', async () => {
    const content = HEADER + OK_ROW.repeat(1000) + 'Elec"tricity,10,kWh,2024-01-01\n';
    expect(await ingest(content)).toMatchObject({ status: 'FAILED', errorCode: 'MALFORMED_CSV' });
  });

  it('RISK: spreadsheet formulas are stored verbatim (CSV/formula injection on any future export)', async () => {
    const result = await ingest(
      HEADER +
        '"=HYPERLINK(""http://evil.example"",""click"")",10,kWh,2024-01-01\n' +
        "+cmd|' /C calc'!A0,10,kWh,2024-01-01\n" +
        '@SUM(1+1),10,kWh,2024-01-01\n',
    );
    expect(result.categories).toEqual([
      '=HYPERLINK("http://evil.example","click")',
      "+cmd|' /C calc'!A0",
      '@SUM(1+1)',
    ]);
  });

  it('RISK: invisible and bidi characters create look-alike categories', async () => {
    const result = await ingest(
      HEADER + 'Electricity,10,kWh,2024-01-01\nElectricity​,10,kWh,2024-01-01\n',
    );
    expect(result.processedRows).toBe(2);
    expect(new Set(result.categories).size).toBe(2); // renders identically in the UI
  });

  it('OK: numeric edge cases are rejected per row, not per file', async () => {
    const bad = ['NaN', 'Infinity', '1e5', '-1', '0', '+1', '"1,5"', '0.00001', '99999999999'];
    const result = await ingest(
      HEADER + bad.map((amount) => `E,${amount},kWh,2024-01-01\n`).join('') + OK_ROW,
    );
    expect(result).toMatchObject({ status: 'COMPLETED', processedRows: 1, failedRows: bad.length });
  });

  it('RISK: no business range on dates (year 0100 and 9999 are accepted)', async () => {
    const result = await ingest(HEADER + 'E,1,kWh,0100-01-01\nE,1,kWh,9999-12-31\n');
    expect(result).toMatchObject({ status: 'COMPLETED', processedRows: 2 });
  });

  it('OK: semicolon or tab delimited files fail fast with INVALID_HEADER', async () => {
    expect((await ingest('category;amount;unit;date\nE;1;kWh;2024-01-01\n')).errorCode).toBe(
      'INVALID_HEADER',
    );
  });
});
