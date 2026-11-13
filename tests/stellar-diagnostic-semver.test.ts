import { describe, expect, it } from 'vitest';
import type { RunCommand } from '../src/diagnostics/process.js';
import { createStellarDiagnostic } from '../src/diagnostics/stellar.js';

function runVersion(output: string) {
  const execute: RunCommand = () => ({
    status: 0,
    stdout: output,
    stderr: '',
  });

  return createStellarDiagnostic(execute).run();
}

describe('Stellar CLI semantic-version grammar', () => {
  it.each([
    '27.1.0',
    'v27.1.0',
    '27.1.0-rc.1',
    '27.1.0+build.42',
    '27.1.0-rc.1+sha.abcdef',
    '28.0.0-preview.3',
    '27.1.0-0',
    '27.1.0+001',
  ])('accepts valid SemVer output %s', (output) => {
    const diagnostic = runVersion(output);

    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.message).toBe('Supported version 27.1.0 detected.');
  });

  it.each([
    '027.1.0',
    '27.01.0',
    '27.1.00',
    '27.1.0-',
    '27.1.0+',
    '27.1.0-..',
    '27.1.0-alpha..beta',
    '27.1.0+build..7',
    '27.1.0-01',
    '27.1.0-alpha.01',
    '27.1.0-alpha+',
    '27.1.0+build+extra',
  ])('rejects malformed SemVer output %s', (output) => {
    const diagnostic = runVersion(output);

    expect(diagnostic.status).toBe('fail');
    expect(diagnostic.message).toBe(
      'Stellar CLI returned an unrecognized version.',
    );
  });
});
