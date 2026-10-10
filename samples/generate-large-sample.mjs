// Generates samples/large-sample.csv (50,000 valid rows) to make the PROCESSING state observable.
// Usage: node samples/generate-large-sample.mjs
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TOTAL_ROWS = 50_000;
const CATEGORIES = [
  ['Electricity', 'kWh'],
  ['Natural Gas', 'm3'],
  ['Transportation', 'km'],
  ['Waste', 'kg'],
  ['Water', 'm3'],
];

const outputPath = join(dirname(fileURLToPath(import.meta.url)), 'large-sample.csv');
const stream = createWriteStream(outputPath, { encoding: 'utf8' });

stream.write('category,amount,unit,date\n');
for (let i = 0; i < TOTAL_ROWS; i += 1) {
  const [category, unit] = CATEGORIES[i % CATEGORIES.length];
  const amount = (((i * 37) % 99_900) / 100 + 1).toFixed(2);
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  if (!stream.write(`${category},${amount},${unit},2024-${month}-${day}\n`)) {
    await once(stream, 'drain');
  }
}
stream.end();
await once(stream, 'finish');

console.log(`Wrote ${TOTAL_ROWS} rows to ${outputPath}`);
