import { describe, expect, it } from 'vitest';

import { STELLARFORGE_CLI_NAME } from '../src/index.js';

describe('StellarForge CLI package foundation', () => {
  it('exports the CLI identity from the source module', () => {
    expect(STELLARFORGE_CLI_NAME).toBe('StellarForge CLI');
  });
});
