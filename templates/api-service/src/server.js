import { createServer } from 'node:http';
import { getConfig } from './config.js';
import {
  createStellarBoundary,
  getStellarNetworkDescriptor,
} from './stellar-client.js';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
}

export function createRequestHandler(env = globalThis.process.env) {
  const config = getConfig(env);
  const stellar = createStellarBoundary(config);

  return (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        app: '{{projectName}}',
        network: config.network,
      });
      return;
    }

    if (request.method === 'GET' && request.url === '/stellar/network') {
      sendJson(response, 200, getStellarNetworkDescriptor(stellar));
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  };
}

export function createApiServer(env = globalThis.process.env) {
  return createServer(createRequestHandler(env));
}
