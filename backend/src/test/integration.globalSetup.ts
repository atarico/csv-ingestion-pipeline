import { execSync } from 'node:child_process';

/** Applies committed migrations to the test database once before the integration project. */
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
}
