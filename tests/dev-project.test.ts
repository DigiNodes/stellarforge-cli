import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationCliError } from '../src/errors/errors.js';
import { resolveDevProcessPlan } from '../src/dev/project.js';
import { withTempDirectory } from './helpers/index.js';

describe('development project plan', () => {
  it('selects a safe npm start script from a generated Node project', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'demo',
          scripts: { start: 'node src/index.js' },
        }),
      );

      const plan = resolveDevProcessPlan(root);

      expect(plan).toHaveLength(1);
      expect(plan[0]).toEqual({
        label: 'demo',
        command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: ['run', 'start'],
        cwd: root,
      });
    }));

  it('prefers an explicit dev script and never executes package script text itself', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'demo',
          scripts: {
            dev: 'node dev.js --flag && echo unsafe-if-shell-expanded',
            start: 'node start.js',
          },
        }),
      );

      const [spec] = resolveDevProcessPlan(root);

      expect(spec?.args).toEqual(['run', 'dev']);
      expect(spec?.args).not.toContain(
        'node dev.js --flag && echo unsafe-if-shell-expanded',
      );
    }));

  it('rejects unsupported or malformed project roots before spawning', () =>
    withTempDirectory((root) => {
      expect(() => resolveDevProcessPlan(root)).toThrow(ValidationCliError);

      mkdirSync(join(root, 'nested'));
      writeFileSync(join(root, 'package.json'), '{not-json');
      expect(() => resolveDevProcessPlan(root)).toThrow('not valid JSON');

      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ scripts: {} }),
      );
      expect(() => resolveDevProcessPlan(root)).toThrow(
        'No supported development script',
      );
    }));
});
