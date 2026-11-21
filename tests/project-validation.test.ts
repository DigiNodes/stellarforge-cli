import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ValidationCliError } from '../src/errors/errors.js';
import { createValidateCommand } from '../src/commands/validate.js';
import {
  planProjectDestination,
  validateProjectInput,
} from '../src/generator/validation.js';
import {
  renderProjectValidationReport,
  runProjectValidationChecks,
} from '../src/validate.js';
import {
  createCapturedTerminalOutput,
  withTempDirectory,
} from './helpers/index.js';

describe('project input validation', () => {
  it.each([
    '../escape',
    '..\\escape',
    '/tmp/escape',
    'C:\\temp\\escape',
    'C:/temp/escape',
    '.',
    '..',
    '.hidden',
    'nested/project',
    'nested\\project',
  ])('rejects path-like or traversal project name %j', (projectName) => {
    expect(() =>
      validateProjectInput({ projectName, cwd: '/workspace' }),
    ).toThrow(ValidationCliError);
  });

  it.each(['CON', 'prn', 'AUX.txt', 'COM1', 'lpt9.log'])(
    'rejects Windows reserved device name %j',
    (projectName) => {
      expect(() =>
        validateProjectInput({ projectName, cwd: '/workspace' }),
      ).toThrow('reserved Windows device name');
    },
  );

  it.each(['demo', 'demo-app', 'demo_app', 'demo.app', 'Demo123'])(
    'accepts safe single-segment project name %j',
    (projectName) => {
      const validated = validateProjectInput({
        projectName,
        cwd: './workspace/..',
      });

      expect(validated.projectName).toBe(projectName);
      expect(validated.cwd).toBe(resolve('./workspace/..'));
    },
  );

  it.each([
    '   ',
    '\t',
    '\n',
    '\r\n',
    '\u00A0',
    '\u200B',
    '\u0000',
    'de mo',
    'de\tmo',
    'de\nmo',
    'demo\u0000',
    'demo\u200B',
  ])('rejects ambiguous whitespace/control input %j', (projectName) => {
    expect(() =>
      validateProjectInput({ projectName, cwd: '/workspace' }),
    ).toThrow(ValidationCliError);
  });

  it.each(['  demo  ', '\tdemo', 'demo\n', 'demo\u00A0'])(
    'normalizes surrounding whitespace in %j to a single segment',
    (projectName) => {
      const validated = validateProjectInput({
        projectName,
        cwd: '/workspace',
      });

      expect(validated.projectName).toBe('demo');
    },
  );
});

describe('project destination planning', () => {
  it('plans a direct child without creating it', () =>
    withTempDirectory((path) => {
      const validated = validateProjectInput({
        projectName: 'demo',
        cwd: path,
      });
      const plan = planProjectDestination(validated);

      expect(plan).toEqual({
        projectName: 'demo',
        destination: join(path, 'demo'),
      });
    }));

  it('allows an existing empty destination directory', () =>
    withTempDirectory((path) => {
      const destination = join(path, 'demo');
      mkdirSync(destination);

      const plan = planProjectDestination(
        validateProjectInput({ projectName: 'demo', cwd: path }),
      );

      expect(plan.destination).toBe(destination);
    }));

  it('refuses an existing non-empty destination directory', () =>
    withTempDirectory((path) => {
      const destination = join(path, 'demo');
      mkdirSync(destination);
      writeFileSync(join(destination, 'existing.txt'), 'do not overwrite');

      expect(() =>
        planProjectDestination(
          validateProjectInput({ projectName: 'demo', cwd: path }),
        ),
      ).toThrow('will not overwrite existing files');
    }));

  it('refuses a destination occupied by a file', () =>
    withTempDirectory((path) => {
      writeFileSync(join(path, 'demo'), 'existing file');

      expect(() =>
        planProjectDestination(
          validateProjectInput({ projectName: 'demo', cwd: path }),
        ),
      ).toThrow('is not a directory');
    }));
  it('treats hidden entries as non-empty (no overwrite)', () =>
    withTempDirectory((path) => {
      const destination = join(path, 'demo');
      mkdirSync(destination);
      // Dotfile only — still non-empty for destination policy
      writeFileSync(join(destination, '.gitkeep'), '');

      expect(() =>
        planProjectDestination(
          validateProjectInput({ projectName: 'demo', cwd: path }),
        ),
      ).toThrow('will not overwrite existing files');
    }));

  it('treats nested subdirectory content as non-empty (no overwrite)', () =>
    withTempDirectory((path) => {
      const destination = join(path, 'demo');
      mkdirSync(join(destination, 'nested'), { recursive: true });
      writeFileSync(join(destination, 'nested', 'file.txt'), 'x');

      expect(() =>
        planProjectDestination(
          validateProjectInput({ projectName: 'demo', cwd: path }),
        ),
      ).toThrow('will not overwrite existing files');
    }));

  it('allows empty destination and does not require a force flag', () =>
    withTempDirectory((path) => {
      const destination = join(path, 'demo');
      mkdirSync(destination);

      const plan = planProjectDestination(
        validateProjectInput({ projectName: 'demo', cwd: path }),
      );

      // Policy: empty existing dir is OK; no force/overwrite API involved
      expect(plan.destination).toBe(destination);
      expect(plan.projectName).toBe('demo');
    }));
});

describe('local project validation contract (SW-201)', () => {
  function writeNodeManifest(root: string): void {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'demo', scripts: { test: 'vitest run' } }),
    );
  }

  function writeCargoManifest(root: string): void {
    writeFileSync(
      join(root, 'Cargo.toml'),
      '[package]\nname = "demo"\nversion = "0.1.0"\n',
    );
  }

  it('reports a passing project with stable ids in deterministic order', () =>
    withTempDirectory((root) => {
      writeNodeManifest(root);
      const report = runProjectValidationChecks(root);

      expect(report.results.map((entry) => entry.id)).toEqual([
        'project.manifest-present',
        'project.package-json.parseable',
        'project.package-json.scripts-test',
        'project.cargo-toml.parseable',
        'project.configuration.well-formed',
      ]);
      expect(report.results.map((entry) => entry.status)).toEqual([
        'pass',
        'pass',
        'pass',
        'pass',
        'pass',
      ]);
      expect(report.summary.requiredFailures).toBe(0);
      expect(report.summary.fail).toBe(0);
    }));

  it('is deterministic across repeated runs', () =>
    withTempDirectory((root) => {
      writeNodeManifest(root);
      writeCargoManifest(root);
      const first = runProjectValidationChecks(root);
      const second = runProjectValidationChecks(root);

      expect(first).toEqual(second);
    }));

  it('fails when no supported manifest exists', () =>
    withTempDirectory((root) => {
      const report = runProjectValidationChecks(root);

      const manifest = report.results.find(
        (entry) => entry.id === 'project.manifest-present',
      );
      expect(manifest?.status).toBe('fail');
      expect(report.summary.requiredFailures).toBe(1);
      expect(report.summary.total).toBe(5);
    }));

  it('fails when package.json is malformed JSON', () =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'package.json'), '{ not json');
      const report = runProjectValidationChecks(root);

      const parseable = report.results.find(
        (entry) => entry.id === 'project.package-json.parseable',
      );
      expect(parseable?.status).toBe('fail');
      expect(parseable?.message).toBe('package.json is not valid JSON');
      expect(parseable?.message).not.toContain('{');
      expect(report.summary.requiredFailures).toBe(1);
    }));

  it('fails when package.json has no scripts object', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'demo' }),
      );
      const report = runProjectValidationChecks(root);

      const parseable = report.results.find(
        (entry) => entry.id === 'project.package-json.parseable',
      );
      expect(parseable?.status).toBe('fail');
      expect(report.summary.requiredFailures).toBe(1);
    }));

  it('warns (never fails) when the test script is empty', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'demo', scripts: { test: '   ' } }),
      );
      const report = runProjectValidationChecks(root);

      const scriptsTest = report.results.find(
        (entry) => entry.id === 'project.package-json.scripts-test',
      );
      expect(scriptsTest?.status).toBe('warn');
      expect(scriptsTest?.required).toBe(false);
      expect(report.summary.requiredFailures).toBe(0);
    }));

  it('passes for a Cargo-only project', () =>
    withTempDirectory((root) => {
      writeCargoManifest(root);
      const report = runProjectValidationChecks(root);

      const cargo = report.results.find(
        (entry) => entry.id === 'project.cargo-toml.parseable',
      );
      expect(cargo?.status).toBe('pass');
      expect(report.summary.requiredFailures).toBe(0);
    }));

  it('fails for a Cargo.toml with invalid UTF-8 bytes', () =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'Cargo.toml'), Buffer.from([0x5b, 0x80, 0x5d]));
      const report = runProjectValidationChecks(root);

      const cargo = report.results.find(
        (entry) => entry.id === 'project.cargo-toml.parseable',
      );
      expect(cargo?.status).toBe('fail');
      expect(report.summary.requiredFailures).toBe(1);
    }));

  it('fails for a Cargo.toml without [package] or [workspace]', () =>
    withTempDirectory((root) => {
      writeFileSync(join(root, 'Cargo.toml'), 'name = "demo"\n');
      const report = runProjectValidationChecks(root);

      const cargo = report.results.find(
        (entry) => entry.id === 'project.cargo-toml.parseable',
      );
      expect(cargo?.status).toBe('fail');
    }));

  it('fails when stellarforge.config.json has an invalid network value', () =>
    withTempDirectory((root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ scripts: {} }),
      );
      writeFileSync(
        join(root, 'stellarforge.config.json'),
        JSON.stringify({ version: 1, network: 'pubnet' }),
      );
      const report = runProjectValidationChecks(root);

      const config = report.results.find(
        (entry) => entry.id === 'project.configuration.well-formed',
      );
      expect(config?.status).toBe('fail');
      expect(report.summary.requiredFailures).toBe(1);
    }));

  it('never reflects secret config values in any finding or rendered output', () =>
    withTempDirectory((root) => {
      writeNodeManifest(root);
      writeFileSync(
        join(root, 'stellarforge.config.json'),
        JSON.stringify({
          version: 1,
          token: 'SENTINEL-SECRET-xyz-123',
        }),
      );
      const report = runProjectValidationChecks(root);

      for (const result of report.results) {
        expect(result.message).not.toContain('SENTINEL-SECRET');
        expect(result.remediation ?? '').not.toContain('SENTINEL-SECRET');
      }

      const captured = createCapturedTerminalOutput();
      renderProjectValidationReport(report, captured.output);
      expect(captured.stdoutText()).not.toContain('SENTINEL-SECRET');
      expect(captured.stdoutText()).not.toContain(root);
    }));

  it('exits 0 for a valid project and 5 for a required failure', async () =>
    withTempDirectory(async (root) => {
      writeNodeManifest(root);
      const passExitCode = vi.fn();
      const ok = createValidateCommand({
        root: () => root,
        output: createCapturedTerminalOutput().output,
        setExitCode: passExitCode,
      });

      await ok.parseAsync(['node', 'validate']);
      expect(passExitCode).toHaveBeenCalledWith(0);

      withTempDirectory(async (failRoot) => {
        writeFileSync(join(failRoot, 'package.json'), '{ not json');
        const failExitCode = vi.fn();
        const bad = createValidateCommand({
          root: () => failRoot,
          output: createCapturedTerminalOutput().output,
          setExitCode: failExitCode,
        });

        await bad.parseAsync(['node', 'validate']);
        expect(failExitCode).toHaveBeenCalledWith(5);
      });
    }));
});
