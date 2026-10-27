// Prints how the real handler + parser treat adversarial CSV inputs (in-memory repositories).
// Run: npx tsx src/audit/csv-edge-cases.probe.ts
import pino from 'pino';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { Upload } from '../document-processing/domain/entities/Upload.js';
import { FileName } from '../document-processing/domain/value-objects/FileName.js';
import { CsvParseCsvParser } from '../document-processing/infrastructure/csv/CsvParseCsvParser.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { InMemoryUploadRepository } from '../shared/infrastructure/testing/InMemoryUploadRepository.js';
import { InMemoryActivityDataRepository } from '../shared/infrastructure/testing/InMemoryActivityDataRepository.js';

const H = 'category,amount,unit,date';
const ok = 'Electricity,10,kWh,2024-01-01';
const cases: Array<[string, Buffer | string]> = [
  ['whitespace only', '   \n  \n'],
  ['header only', H + '\n'],
  ['1 row', `${H}\n${ok}\n`],
  ['UTF-8 BOM', '﻿' + `${H}\n${ok}\n`],
  [
    'UTF-16LE w/ BOM',
    Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`${H}\n${ok}\n`, 'utf16le')]),
  ],
  ['CRLF', `${H}\r\n${ok}\r\n`],
  ['CR only (old Mac)', `${H}\r${ok}\r`],
  ['mixed LF/CRLF', `${H}\n${ok}\r\n${ok}\n`],
  ['semicolon delimiter', `category;amount;unit;date\nElectricity;10;kWh;2024-01-01\n`],
  ['tab delimiter', `category\tamount\tunit\tdate\nE\t10\tkWh\t2024-01-01\n`],
  ['duplicate column', `${H},amount\n${ok},5\n`],
  ['header uppercase+spaces', ` CATEGORY , Amount ,UNIT, date \n${ok}\n`],
  ['extra field in row', `${H}\n${ok},EXTRA\n${ok}\n`],
  ['missing field in row', `${H}\nElectricity,10,kWh\n${ok}\n`],
  ['unclosed quote mid-file', `${H}\n${ok}\n"Electricity,10,kWh,2024-01-01\n${ok}\n${ok}\n`],
  ['stray quote inside field', `${H}\nElec"tricity,10,kWh,2024-01-01\n${ok}\n`],
  ['quoted field w/ newline', `${H}\n"Elec\ntricity",10,kWh,2024-01-01\n${ok}\n`],
  [
    'invalid UTF-8 bytes',
    Buffer.concat([
      Buffer.from(`${H}\n`),
      Buffer.from([0xff, 0xfe, 0xfd]),
      Buffer.from(`,10,kWh,2024-01-01\n`),
    ]),
  ],
  [
    'Latin-1 (Excel ES) é',
    Buffer.concat([
      Buffer.from(`${H}\nCalefacci`),
      Buffer.from([0xf3]),
      Buffer.from(`n,10,kWh,2024-01-01\n`),
    ]),
  ],
  ['date 2024-02-30', `${H}\nE,10,kWh,2024-02-30\n${ok}\n`],
  ['date 0100-01-01', `${H}\nE,10,kWh,0100-01-01\n`],
  ['date 9999-12-31', `${H}\nE,10,kWh,9999-12-31\n`],
  ['date 01/02/2024', `${H}\nE,10,kWh,01/02/2024\n${ok}\n`],
  ['amount 9999999999.9999', `${H}\nE,9999999999.9999,kWh,2024-01-01\n`],
  ['amount 99999999999', `${H}\nE,99999999999,kWh,2024-01-01\n${ok}\n`],
  [
    'amount NaN/Infinity/1e5/-1/0/+1/"1,5"',
    `${H}\nE,NaN,kWh,2024-01-01\nE,Infinity,kWh,2024-01-01\nE,1e5,kWh,2024-01-01\nE,-1,kWh,2024-01-01\nE,0,kWh,2024-01-01\nE,+1,kWh,2024-01-01\nE,"1,5",kWh,2024-01-01\n${ok}\n`,
  ],
  ['amount 0.00001', `${H}\nE,0.00001,kWh,2024-01-01\n${ok}\n`],
  [
    'formula injection',
    `${H}\n"=HYPERLINK(""http://evil"",""x"")",10,kWh,2024-01-01\n+cmd|' /C calc'!A0,10,kWh,2024-01-01\n@SUM(1),10,kWh,2024-01-01\n-2+3,10,kWh,2024-01-01\n`,
  ],
  [
    'bidi override / zero-width',
    `${H}\nE\u202Egnp.exe,10,kWh,2024-01-01\nE\u200B,10,k\u200BWh,2024-01-01\n`,
  ],
  ['NUL byte in category', `${H}\nE\u0000x,10,kWh,2024-01-01\n${ok}\n`],
  ['category 101 chars', `${H}\n${'x'.repeat(101)},10,kWh,2024-01-01\n${ok}\n`],
  ['blank lines between', `${H}\n\n\n${ok}\n\n${ok}\n`],
  ['only commas rows', `${H}\n,,,\n,,,\n`],
];

const parser = new CsvParseCsvParser();
const logger = pino({ level: 'silent' }) as never;
for (const [name, content] of cases) {
  const storage = new InMemoryFileStorage();
  const uploads = new InMemoryUploadRepository();
  const rowsRepo = new InMemoryActivityDataRepository();
  const fn = FileName.create('x.csv');
  if (fn.isLeft()) throw fn.value;
  const u = Upload.create({ fileName: fn.value, userId: 'u' });
  storage.files.set(u.fileKey, Buffer.isBuffer(content) ? content : Buffer.from(content));
  await uploads.save(u);
  const h = new ProcessFileCommandHandler(uploads, rowsRepo, storage, parser, logger);
  let out: string;
  try {
    const r = await h.execute({ uploadId: u.id, fileKey: u.fileKey });
    const saved = (await uploads.findById(u.id))!;
    const stored = (await rowsRepo.findByUploadId(u.id, { page: 1, limit: 10 })).items.map(
      (a) =>
        JSON.stringify(a.category.value) + ':' + a.amount.toString() + ':' + a.date.toISODate(),
    );
    out = r.isLeft()
      ? `LEFT ${r.value.constructor.name}`
      : `${saved.status.value} ok=${saved.processedRows} bad=${saved.failedRows} code=${saved.errorCode ?? '-'} ${saved.errorMessage ? '«' + saved.errorMessage.slice(0, 70) + '»' : ''} errs=${saved.rowErrors.map((e) => e.row + '/' + e.field + '/' + e.code).join(',')} stored=${stored.join(' | ').slice(0, 160)}`;
  } catch (e) {
    out = `THROW ${(e as Error).message}`;
  }
  console.log(`${name.padEnd(38)} ${out}`);
}
