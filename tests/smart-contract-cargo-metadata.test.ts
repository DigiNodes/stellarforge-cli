import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import { resolveTestProcessPlan } from '../src/testing/project.js';
import {
  createCapturedTerminalOutput,
  withTempDirectory,
} from './helpers/index.js';

const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const cargoAvailable =
  spawnSync(cargo, ['--version'], { shell: false, timeout: 5_000 }).status ===
  0;

function generate(root: string, name: string): string {
  createNewCommand({
    cwd: () => root,
    output: createCapturedTerminalOutput().output,
  }).parse(['node', 'new', name, '--template', 'smart-contract']);
  return join(root, name);
}

// These small, controlled manifests intentionally have no extra metadata or
// credential-bearing registry overrides. Compare logical lines on all platforms;
// Cargo below provides the independent TOML/semantic validation when installed.
function manifestLines(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

interface CargoMetadata {
  workspace_root: string;
  workspace_members: string[];
  workspace_default_members: string[];
  packages: {
    id: string;
    name: string;
    version: string;
    edition: string;
    manifest_path: string;
    publish: string[];
    dependencies: {
      name: string;
      req: string;
      kind: string | null;
      features: string[];
      source: string;
    }[];
    targets: {
      name: string;
      kind: string[];
      crate_types: string[];
      src_path: string;
      doctest: boolean;
      test: boolean;
    }[];
  }[];
}

describe('Smart Contract Cargo metadata conformance (SW-046)', () => {
  it.each(['demo-contract', 'demo.contract', 'Demo_Contract'])(
    'keeps workspace and package metadata consistent for %s',
    (name) =>
      withTempDirectory((root) => {
        const project = generate(root, name);
        const contract = join(project, 'contracts', 'hello');
        expect(readdirSync(join(project, 'contracts'))).toEqual(['hello']);
        expect(manifestLines(join(project, 'Cargo.toml'))).toEqual([
          '[workspace]',
          'resolver = "2"',
          'members = ["contracts/*"]',
          '[workspace.dependencies]',
          'soroban-sdk = "26"',
          '[profile.release]',
          'opt-level = "z"',
          'overflow-checks = true',
          'debug = 0',
          'strip = "symbols"',
          'debug-assertions = false',
          'panic = "abort"',
          'codegen-units = 1',
          'lto = true',
        ]);
        expect(manifestLines(join(contract, 'Cargo.toml'))).toEqual([
          '[package]',
          'name = "stellarforge-starter-contract"',
          'version = "0.1.0"',
          'edition = "2021"',
          'publish = false',
          '[lib]',
          'crate-type = ["cdylib"]',
          'doctest = false',
          '[dependencies]',
          'soroban-sdk = { workspace = true }',
          '[dev-dependencies]',
          'soroban-sdk = { workspace = true, features = ["testutils"] }',
        ]);
        expect(existsSync(join(contract, 'src', 'lib.rs'))).toBe(true);
        expect(existsSync(join(contract, 'src', 'test.rs'))).toBe(true);
        expect(readFileSync(join(contract, 'src', 'lib.rs'), 'utf8')).toMatch(
          /mod test;/,
        );
        expect(resolveTestProcessPlan(project)).toEqual([
          { label: 'cargo:test', command: cargo, args: ['test'], cwd: project },
        ]);
        const readme = readFileSync(join(project, 'README.md'), 'utf8').replace(
          /\r\n/g,
          '\n',
        );
        expect(readme).toContain(`# ${name}`);
        expect(readme).toContain('```bash\ncargo test\n```');
        expect(readme).toContain('```bash\nstellar contract build\n```');
      }),
  );

  it('does not embed signing material or registry credentials in either manifest', () =>
    withTempDirectory((root) => {
      const project = generate(root, 'credential-free');
      for (const path of [
        join(project, 'Cargo.toml'),
        join(project, 'contracts', 'hello', 'Cargo.toml'),
      ]) {
        const raw = readFileSync(path, 'utf8');
        expect(raw).not.toMatch(/SECRET|SEED|PRIVATE_KEY|TOKEN|PASSWORD/i);
        expect(raw).not.toMatch(/S[A-Z0-9]{55}/);
        expect(raw).not.toMatch(/https?:\/\/[^\s/]+@/i);
        expect(raw).not.toContain('{{');
      }
      expect(existsSync(join(project, '.cargo', 'credentials'))).toBe(false);
      expect(existsSync(join(project, '.cargo', 'credentials.toml'))).toBe(
        false,
      );
    }));

  it.skipIf(!cargoAvailable)(
    'resolves the generated member, library target and inherited SDK offline',
    () =>
      withTempDirectory((root) => {
        const project = generate(root, 'cargo.metadata-project');
        const result = spawnSync(
          cargo,
          ['metadata', '--offline', '--no-deps', '--format-version=1'],
          { cwd: project, encoding: 'utf8', shell: false, timeout: 10_000 },
        );
        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
        const metadata = JSON.parse(result.stdout) as CargoMetadata;
        expect(resolve(metadata.workspace_root)).toBe(resolve(project));
        expect(metadata.packages).toHaveLength(1);
        const pkg = metadata.packages[0]!;
        expect(metadata.workspace_members).toEqual([pkg.id]);
        expect(metadata.workspace_default_members).toEqual([pkg.id]);
        expect(pkg).toMatchObject({
          name: 'stellarforge-starter-contract',
          version: '0.1.0',
          edition: '2021',
          publish: [],
        });
        expect(resolve(pkg.manifest_path)).toBe(
          resolve(project, 'contracts', 'hello', 'Cargo.toml'),
        );
        expect(pkg.targets).toHaveLength(1);
        expect(pkg.targets[0]).toMatchObject({
          name: 'stellarforge_starter_contract',
          kind: ['cdylib'],
          crate_types: ['cdylib'],
          doctest: false,
          test: true,
        });
        expect(resolve(pkg.targets[0]!.src_path)).toBe(
          resolve(project, 'contracts', 'hello', 'src', 'lib.rs'),
        );
        expect(pkg.dependencies).toHaveLength(2);
        for (const kind of [null, 'dev']) {
          expect(
            pkg.dependencies.find((dep) => dep.kind === kind),
          ).toMatchObject({
            name: 'soroban-sdk',
            req: '^26',
            features: kind === 'dev' ? ['testutils'] : [],
            source: 'registry+https://github.com/rust-lang/crates.io-index',
          });
        }
      }),
    15_000,
  );
});
