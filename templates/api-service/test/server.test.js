import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { getConfig } from '../src/config.js';
import { createApiServer } from '../src/server.js';
import {
  createStellarBoundary,
  getStellarNetworkDescriptor,
} from '../src/stellar-client.js';

test('configuration validates ports and remote endpoint protocols', () => {
  assert.throws(() => getConfig({ API_PORT: '70000' }), /API_PORT/);
  assert.throws(
    () => getConfig({ STELLAR_RPC_URL: 'http://example.com/rpc' }),
    /HTTPS/,
  );
});

test('Stellar boundary exposes configured public endpoints without network calls', () => {
  const config = getConfig({
    STELLAR_NETWORK: 'TESTNET',
    STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
  });

  assert.deepEqual(
    getStellarNetworkDescriptor(createStellarBoundary(config)),
    {
      network: 'TESTNET',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    },
  );
});

test('HTTP server exposes health and Stellar network routes', async () => {
  const server = createApiServer({ STELLAR_NETWORK: 'TESTNET' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, 'object');

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await globalThis.fetch(`${baseUrl}/health`);
    const healthPayload = await health.json();

    assert.equal(health.status, 200);
    assert.deepEqual(healthPayload, {
      status: 'ok',
      app: '{{projectName}}',
      network: 'TESTNET',
    });

    const stellar = await globalThis.fetch(`${baseUrl}/stellar/network`);
    const stellarPayload = await stellar.json();

    assert.equal(stellar.status, 200);
    assert.equal(stellarPayload.network, 'TESTNET');
    assert.match(stellarPayload.horizonUrl, /^https:\/\//);
    assert.match(stellarPayload.rpcUrl, /^https:\/\//);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
