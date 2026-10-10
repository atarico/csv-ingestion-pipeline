import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const nodeEnv = process.env['NODE_ENV'] ?? 'development';
loadEnv({ path: `.env.${nodeEnv}` });
loadEnv({ path: '.env' });

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL is required to run Prisma commands');
}

export default defineConfig({
  schema: 'src/document-processing/infrastructure/persistence/models/schema.prisma',
  migrations: {
    path: 'src/document-processing/infrastructure/persistence/models/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
