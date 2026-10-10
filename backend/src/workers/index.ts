import { loadConfig } from '../config/index.js';
import type { ILogger } from '../shared/application/ports/ILogger.js';
import { createAppContainer } from '../main/container.js';
import type { FileProcessingWorker } from './FileProcessingWorker.js';

const config = loadConfig();
const container = createAppContainer(config);
const worker = container.resolve<FileProcessingWorker>('fileProcessingWorker');
const logger = container.resolve<ILogger>('logger');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'Shutting down worker');
    worker.stop();
  });
}

await worker.start();
await container.dispose();
process.exit(0);
