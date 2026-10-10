import pino from 'pino';
import type { NodeEnv } from '../../../config/IConvictProps.js';

/** development: pino-pretty transport; test/production: plain JSON to stdout. */
export function createLogger(level: string, env: NodeEnv): pino.Logger {
  if (env === 'development') {
    return pino({ level, transport: { target: 'pino-pretty' } });
  }
  return pino({ level });
}
