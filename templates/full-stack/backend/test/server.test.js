import assert from 'node:assert/strict';
import test from 'node:test';
import { createHealthPayload, getBackendConfig } from '../src/server.js';

test('uses safe Testnet defaults without secrets', () => {
  const config = getBackendConfig({});

  assert.equal(config.network, 'TESTNET');
  assert.equal(config.horizonUrl, 'https://horizon-testnet.stellar.org');
  assert.equal(config.rpcUrl, 'https://soroban-testnet.stellar.org');
  assert.equal(config.port, 3000);
});

test('returns a generated application health payload', () => {
  assert.deepEqual(createHealthPayload({}), {
    status: 'ok',
    app: '{{projectName}}',
    network: 'TESTNET',
  });
});
