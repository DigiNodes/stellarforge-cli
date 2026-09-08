import { URL } from 'node:url';

const DEFAULTS = Object.freeze({
  host: '127.0.0.1',
  port: 3000,
  network: 'TESTNET',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
});

function parsePort(value) {
  const port = Number.parseInt(value ?? String(DEFAULTS.port), 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseUrl(name, value) {
  const url = new URL(value);

  if (
    url.protocol !== 'https:' &&
    url.hostname !== '127.0.0.1' &&
    url.hostname !== 'localhost'
  ) {
    throw new Error(`${name} must use HTTPS unless it targets localhost.`);
  }

  return url.toString().replace(/\/$/, '');
}

export function getConfig(env = globalThis.process.env) {
  return {
    host: env.API_HOST ?? DEFAULTS.host,
    port: parsePort(env.API_PORT),
    network: env.STELLAR_NETWORK ?? DEFAULTS.network,
    horizonUrl: parseUrl(
      'STELLAR_HORIZON_URL',
      env.STELLAR_HORIZON_URL ?? DEFAULTS.horizonUrl,
    ),
    rpcUrl: parseUrl(
      'STELLAR_RPC_URL',
      env.STELLAR_RPC_URL ?? DEFAULTS.rpcUrl,
    ),
  };
}
