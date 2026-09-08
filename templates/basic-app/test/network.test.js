import assert from 'node:assert/strict';
import test from 'node:test';
import { getNetworkConfig } from '../src/network.js';

test('uses safe Stellar Testnet defaults', () => {
  const config = getNetworkConfig({});

  assert.equal(config.horizonUrl, 'https://horizon-testnet.stellar.org');
  assert.equal(config.rpcUrl, 'https://soroban-testnet.stellar.org');
  assert.equal(config.networkPassphrase, 'Test SDF Network ; September 2015');
});

test('allows endpoint overrides without requiring secrets', () => {
  const config = getNetworkConfig({
    STELLAR_HORIZON_URL: 'http://127.0.0.1:8000',
    STELLAR_RPC_URL: 'http://127.0.0.1:8001',
  });

  assert.equal(config.horizonUrl, 'http://127.0.0.1:8000');
  assert.equal(config.rpcUrl, 'http://127.0.0.1:8001');
});
