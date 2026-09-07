import { describe, expect, it } from 'vitest';
import { createRootCommand } from '../src/commands/root.js';

describe('StellarForge root command', () => {
  it('defines the stable root identity without registering product commands early', () => {
    const program = createRootCommand('1.2.3');

    expect(program.name()).toBe('stellarforge');
    expect(program.commands).toHaveLength(0);
  });

  it('provides useful global help information', () => {
    const help = createRootCommand('1.2.3').helpInformation();

    expect(help).toContain('Usage: stellarforge [options]');
    expect(help).toContain(
      'Open infrastructure for building production-ready Stellar applications.',
    );
    expect(help).toContain('-V, --version');
    expect(help).toContain('-h, --help');
  });
});
