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

test('health route rejects invalid HTTP methods', async () => {
  const server = createApiServer({ STELLAR_NETWORK: 'TESTNET' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, 'object');

    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Test POST to /health
    const postResponse = await globalThis.fetch(`${baseUrl}/health`, {
      method: 'POST',
    });
    assert.equal(postResponse.status, 404);
    const postPayload = await postResponse.json();
    assert.deepEqual(postPayload, { error: 'not_found' });

    // Test PUT to /health
    const putResponse = await globalThis.fetch(`${baseUrl}/health`, {
      method: 'PUT',
    });
    assert.equal(putResponse.status, 404);
    const putPayload = await putResponse.json();
    assert.deepEqual(putPayload, { error: 'not_found' });

    // Test DELETE to /health
    const deleteResponse = await globalThis.fetch(`${baseUrl}/health`, {
      method: 'DELETE',
    });
    assert.equal(deleteResponse.status, 404);
    const deletePayload = await deleteResponse.json();
    assert.deepEqual(deletePayload, { error: 'not_found' });

    // Test PATCH to /health
    const patchResponse = await globalThis.fetch(`${baseUrl}/health`, {
      method: 'PATCH',
    });
    assert.equal(patchResponse.status, 404);
    const patchPayload = await patchResponse.json();
    assert.deepEqual(patchPayload, { error: 'not_found' });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('health route rejects invalid paths', async () => {
  const server = createApiServer({ STELLAR_NETWORK: 'TESTNET' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, 'object');

    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Test /health with trailing slash
    const trailingSlashResponse = await globalThis.fetch(
      `${baseUrl}/health/`,
    );
    assert.equal(trailingSlashResponse.status, 404);
    const trailingSlashPayload = await trailingSlashResponse.json();
    assert.deepEqual(trailingSlashPayload, { error: 'not_found' });

    // Test /health with extra path segments
    const extraPathResponse = await globalThis.fetch(
      `${baseUrl}/health/status`,
    );
    assert.equal(extraPathResponse.status, 404);
    const extraPathPayload = await extraPathResponse.json();
    assert.deepEqual(extraPathPayload, { error: 'not_found' });

    // Test completely invalid path
    const invalidPathResponse = await globalThis.fetch(`${baseUrl}/invalid`);
    assert.equal(invalidPathResponse.status, 404);
    const invalidPathPayload = await invalidPathResponse.json();
    assert.deepEqual(invalidPathPayload, { error: 'not_found' });

    // Test root path
    const rootResponse = await globalThis.fetch(`${baseUrl}/`);
    assert.equal(rootResponse.status, 404);
    const rootPayload = await rootResponse.json();
    assert.deepEqual(rootPayload, { error: 'not_found' });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('health route response structure remains stable', async () => {
  const server = createApiServer({ STELLAR_NETWORK: 'MAINNET' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, 'object');

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await globalThis.fetch(`${baseUrl}/health`);
    const healthPayload = await health.json();

    // Verify response structure
    assert.equal(typeof healthPayload, 'object');
    assert.equal(Object.keys(healthPayload).length, 3);
    assert.equal(healthPayload.status, 'ok');
    assert.equal(healthPayload.app, '{{projectName}}');
    assert.equal(healthPayload.network, 'MAINNET');

    // Verify content-type header
    assert.equal(
      health.headers.get('content-type'),
      'application/json',
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
