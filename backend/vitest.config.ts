import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node' },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
          globalSetup: ['src/test/integration.globalSetup.ts'],
          fileParallelism: false,
          env: { NODE_ENV: 'test' },
        },
      },
    ],
  },
});
