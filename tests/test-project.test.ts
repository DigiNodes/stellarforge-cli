import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationCliError } from '../src/errors/errors.js';
import { resolveTestProcessPlan } from '../src/testing/project.js';
import { withTempDirectory } from './helpers/index.js';

describe('project test workflow resolution', () => {
  it('resolves a Node.js test script without executing package script text directly', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'demo',
          scripts: { test: 'node --test && echo never-interpolated' },
        }),
      );

      expect(resolveTestProcessPlan(root)).toEqual([
        {
          label: 'demo:test',
          command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
          args: ['run', 'test'],
          cwd: root,
        },
      ]);
    }));

  it('resolves a Cargo workspace test workflow', () =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = []\n');

      expect(resolveTestProcessPlan(root)).toEqual([
        {
          label: 'cargo:test',
          command: process.platform === 'win32' ? 'cargo.exe' : 'cargo',
          args: ['test'],
          cwd: root,
        },
      ]);
    }));

  it('rejects unsupported and malformed projects with actionable guidance', () =>
    withTempDirectory((root) => {
      expect(() => resolveTestProcessPlan(root)).toThrow(ValidationCliError);
      expect(() => resolveTestProcessPlan(root)).toThrow(
        'No supported StellarForge test workflow',
      );

      writeFileSync(join(root, 'package.json'), '{not-json');
      expect(() => resolveTestProcessPlan(root)).toThrow('not valid JSON');

      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ scripts: { start: 'node app.js' } }),
      );
      expect(() => resolveTestProcessPlan(root)).toThrow(
        'does not define a test script',
      );
    }));
});
