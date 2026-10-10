import { loadConfig } from '../config/index.js';
import { buildApp } from './App.js';
import { createAppContainer } from './container.js';

const config = loadConfig();
const container = createAppContainer(config);
const app = buildApp(container);

await app.listen({ port: config.port, host: config.host });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(() => container.dispose())
      .then(() => process.exit(0));
  });
}
