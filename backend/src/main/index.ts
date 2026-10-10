import Fastify from 'fastify';
import { loadConfig } from '../config/index.js';

const config = loadConfig();
const app = Fastify();

app.get('/health', () => ({ status: 'ok' }));

await app.listen({ port: config.port, host: config.host });
