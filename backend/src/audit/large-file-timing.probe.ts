// Times one ~5 MiB adversarial file through the real handler against the test Postgres.
// Run: NODE_ENV=test npx tsx src/audit/large-file-timing.probe.ts <valid|commas|blank|bigfield|nonewline|halfvalid>
import pino from 'pino';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler.js';
import { Upload } from '../document-processing/domain/entities/Upload.js';
import { FileName } from '../document-processing/domain/value-objects/FileName.js';
import { CsvParseCsvParser } from '../document-processing/infrastructure/csv/CsvParseCsvParser.js';
import { PrismaUploadRepository } from '../document-processing/infrastructure/persistence/repositories/PrismaUploadRepository.js';
import { PrismaActivityDataRepository } from '../document-processing/infrastructure/persistence/repositories/PrismaActivityDataRepository.js';
import { InMemoryFileStorage } from '../shared/infrastructure/testing/InMemoryFileStorage.js';
import { createTestPrismaClient } from '../test/db.js';

const MAX = 5 * 1024 * 1024;
const H = 'category,amount,unit,date\n';
function fill(line: string): Buffer {
  const n = Math.floor((MAX - H.length) / line.length);
  return Buffer.from(H + line.repeat(n));
}
const which = process.argv[2]!;
const cases: Record<string, () => Buffer> = {
  valid: () => fill('E,1,kWh,2024-01-01\n'),
  commas: () => fill(',,,\n'),
  blank: () => Buffer.from(H + '\n'.repeat(MAX - H.length)),
  bigfield: () => Buffer.from(H + '"' + 'x'.repeat(MAX - H.length - 30) + '",1,kWh,2024-01-01\n'),
  nonewline: () => Buffer.from(H + 'x'.repeat(MAX - H.length)),
  halfvalid: () => fill('E,1,kWh,2024-01-01\nE,-1,kWh,2024-01-01\n'),
};
const prisma = createTestPrismaClient();
const content = cases[which]!();
const storage = new InMemoryFileStorage();
const uploads = new PrismaUploadRepository(prisma);
const fn = FileName.create('x.csv');
if (fn.isLeft()) throw fn.value;
const u = Upload.create({ fileName: fn.value, userId: 'u' });
storage.files.set(u.fileKey, content);
await uploads.save(u);
const h = new ProcessFileCommandHandler(
  uploads,
  new PrismaActivityDataRepository(prisma),
  storage,
  new CsvParseCsvParser(),
  pino({ level: 'silent' }),
);
let peak = 0;
const t = setInterval(() => {
  peak = Math.max(peak, process.memoryUsage().rss);
}, 20);
const rssBefore = process.memoryUsage().rss;
const t0 = performance.now();
const r = await h.execute({ uploadId: u.id, fileKey: u.fileKey });
const ms = performance.now() - t0;
clearInterval(t);
const s = await prisma.upload.findUniqueOrThrow({ where: { id: u.id } });
const n = await prisma.activityData.count({ where: { uploadId: u.id } });
console.log(
  JSON.stringify({
    case: which,
    bytes: content.length,
    seconds: +(ms / 1000).toFixed(1),
    rssDeltaMB: Math.round((peak - rssBefore) / 1e6),
    status: s.status,
    code: s.errorCode,
    ok: s.processedRows,
    bad: s.failedRows,
    rowsInDb: n,
    left: r.isLeft(),
  }),
);
await prisma.$disconnect();
