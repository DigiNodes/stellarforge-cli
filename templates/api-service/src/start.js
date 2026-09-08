import { getConfig } from './config.js';
import { createApiServer } from './server.js';

const config = getConfig();
const server = createApiServer();

server.listen(config.port, config.host, () => {
  globalThis.console.log(
    `{{projectName}} listening on http://${config.host}:${config.port}`,
  );
});
