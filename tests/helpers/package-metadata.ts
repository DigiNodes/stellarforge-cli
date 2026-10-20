/**
 * Package metadata conformance helper (SW-039).
 *
 * Provides deterministic assertions for generated project package.json files
 * without duplicating boilerplate across template tests.
 *
 * Usage:
 *   import { assertPackageMetadata } from './helpers/index.js';
 *
 *   assertPackageMetadata(join(projectRoot, 'package.json'), {
 *     name: 'my-app',
 *     scripts: { start: 'node src/index.js', test: 'node --test' },
 *     nodeEngine: '>=22.13.0',
 *   });
 */

import { readFileSync } from 'node:fs';
import { expect } from 'vitest';

/** Shape of the scripts record expected in a generated package.json. */
export type ExpectedScripts = Readonly<Record<string, string>>;

/** Options accepted by {@link assertPackageMetadata}. */
export interface PackageMetadataOptions {
  /**
   * Expected value of the `name` field.
   * Asserted with strict equality against the generated project name.
   */
  readonly name: string;

  /**
   * Exact scripts object the generated package.json must contain.
   * The helper asserts both values and that no extra keys are present.
   */
  readonly scripts: ExpectedScripts;

  /**
   * Expected value of `engines.node`.
   * Asserted with strict equality.
   */
  readonly nodeEngine: string;

  /**
   * When true, skip the check that `dependencies` is absent.
   * Useful for templates that intentionally have runtime dependencies.
   * Defaults to false.
   */
  readonly allowDependencies?: boolean;

  /**
   * When true, skip the check that `devDependencies` is absent.
   * Defaults to false.
   */
  readonly allowDevDependencies?: boolean;
}

/**
 * Raw representation of a generated package.json.
 * Only the fields the helper cares about are typed; all others are `unknown`.
 */
interface RawPackageJson {
  name?: unknown;
  scripts?: unknown;
  engines?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  [key: string]: unknown;
}

/**
 * Read and parse a package.json file, throwing a descriptive error when the
 * file is missing or malformed so test failures pinpoint the problem.
 */
export function readPackageJson(packageJsonPath: string): RawPackageJson {
  let raw: string;

  try {
    raw = readFileSync(packageJsonPath, 'utf8');
  } catch (cause) {
    throw new Error(
      `package-metadata helper: cannot read '${packageJsonPath}': ${String(cause)}`,
      { cause },
    );
  }

  try {
    return JSON.parse(raw) as RawPackageJson;
  } catch (cause) {
    throw new Error(
      `package-metadata helper: '${packageJsonPath}' is not valid JSON: ${String(cause)}`,
      { cause },
    );
  }
}

/**
 * Assert that the generated package.json at `packageJsonPath` conforms to the
 * supplied `options`.
 *
 * Checks performed (in order):
 * 1. `name` equals `options.name`.
 * 2. `scripts` values match `options.scripts` exactly (no extra or missing keys).
 * 3. `engines.node` equals `options.nodeEngine`.
 * 4. `dependencies` is absent (unless `allowDependencies` is true).
 * 5. `devDependencies` is absent (unless `allowDevDependencies` is true).
 * 6. The raw file content contains no `SECRET`, `SEED`, or `PRIVATE_KEY` literals.
 * 7. The raw file content contains no Stellar secret key strkey pattern (`S[A-Z0-9]{55}`).
 */
export function assertPackageMetadata(
  packageJsonPath: string,
  options: PackageMetadataOptions,
): void {
  const pkg = readPackageJson(packageJsonPath);
  const raw = readFileSync(packageJsonPath, 'utf8');

  // 1. Package name
  expect(pkg['name'], `package.json 'name' at ${packageJsonPath}`).toBe(
    options.name,
  );

  // 2. Scripts — exact values
  expect(pkg['scripts'], `package.json 'scripts' at ${packageJsonPath}`).toEqual(
    options.scripts,
  );

  // 2b. Scripts — no extra keys beyond what is expected
  const actualScriptKeys = Object.keys(
    (pkg['scripts'] ?? {}) as Record<string, unknown>,
  ).sort();
  const expectedScriptKeys = Object.keys(options.scripts).sort();

  expect(
    actualScriptKeys,
    `package.json 'scripts' keys at ${packageJsonPath}`,
  ).toEqual(expectedScriptKeys);

  // 3. engines.node
  const engines = pkg['engines'] as Record<string, unknown> | undefined;

  expect(
    engines,
    `package.json 'engines' field missing at ${packageJsonPath}`,
  ).toBeDefined();

  expect(
    engines?.['node'],
    `package.json 'engines.node' at ${packageJsonPath}`,
  ).toBe(options.nodeEngine);

  // 4. No runtime dependencies (unless explicitly allowed)
  if (!options.allowDependencies) {
    expect(
      pkg['dependencies'],
      `package.json should have no 'dependencies' at ${packageJsonPath}`,
    ).toBeUndefined();
  }

  // 5. No dev dependencies (unless explicitly allowed)
  if (!options.allowDevDependencies) {
    expect(
      pkg['devDependencies'],
      `package.json should have no 'devDependencies' at ${packageJsonPath}`,
    ).toBeUndefined();
  }

  // 6. No secret-related literals
  expect(
    raw,
    `package.json must not embed SECRET/SEED/PRIVATE_KEY at ${packageJsonPath}`,
  ).not.toMatch(/SECRET|SEED|PRIVATE_KEY/);

  // 7. No Stellar secret key strkeys (56-char uppercase base32 starting with S)
  expect(
    raw,
    `package.json must not embed a Stellar secret key strkey at ${packageJsonPath}`,
  ).not.toMatch(/S[A-Z0-9]{55}/);
}
