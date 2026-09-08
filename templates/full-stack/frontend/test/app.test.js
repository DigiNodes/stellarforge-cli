import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppModel } from '../src/app.js';

test('exposes the generated app identity and Testnet boundary', () => {
  const model = createAppModel();

  assert.equal(model.name, '{{projectName}}');
  assert.equal(model.network, 'Stellar Testnet');
  assert.equal(model.backendHealthPath, '/health');
});
