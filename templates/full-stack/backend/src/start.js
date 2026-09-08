import { createServer } from 'node:http';
import { createHealthPayload, getBackendConfig } from './server.js';

const config = getBackendConfig();
const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(createHealthPayload(globalThis.process.env)));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(config.port, '127.0.0.1');
