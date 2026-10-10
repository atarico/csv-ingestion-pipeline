import { loadConfig } from '../config/index.js';
import { createPrismaClient } from '../document-processing/infrastructure/persistence/PrismaClientFactory.js';
import type { PrismaClient } from '../generated/prisma/client.js';

/** Builds a client against the test database (NODE_ENV=test is set by the integration project). */
export function createTestPrismaClient(): PrismaClient {
  return createPrismaClient(loadConfig().databaseUrl);
}

export async function truncateAll(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ActivityData", "Upload" CASCADE');
}
