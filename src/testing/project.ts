import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DevProcessSpec } from '../dev/project.js';
import { ValidationCliError } from '../errors/errors.js';
import { createNpmInvocation } from '../process/npm.js';

/**
 * Default bound for a single generated-project test command.
 *
 * This is the documented default timeout for `stellarforge test`. It is deliberately
 * generous so legitimate long test suites are not killed, while still ensuring a hung
 * child process tree cannot block a developer indefinitely.
 */
export const DEFAULT_TEST_TIMEOUT_MS = 300_000;

/**
 * Grace period between requesting termination and forcing the child process tree
 * to exit. This is the bounded cleanup window used by the orchestrator.
 */
export const TEST_TIMEOUT_GRACE_MS = 2_000;

/**
 * Dedicated exit code reported when a test workflow is stopped by the timeout
 * policy. This is distinct from a genuine test failure (exit code 3) and from a
 * validation failure (exit code 2). It matches the diagnostic failure category
 * documented in `docs/reference/exit-codes.md`.
 */
export const TEST_TIMEOUT_EXIT_CODE = 5;


/**
 * Future-safe internal option boundary for test execution.
 *
 * Timeout configuration is only accepted through this explicit interface. It is not
 * exposed interactively and it does not affect `dev` unless the caller passes it
 * explicitly there.
 */
export interface TestExecutionOptions {
  /**
   * Maximum wall-clock time in milliseconds allowed for the test command before the
   * orchestrator begins bounded cleanup. Defaults on `DEFAULT_TEST_TIMEOUT_MS`.
   */
  readonly timeoutMs?: number;
}

export function resolveTestTimeoutMs(
  options: TestExecutionOptions = {},
): number {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ValidationCliError(
      'Test timeout must be a positive number of milliseconds.',
    );
  }

  return Math.floor(timeoutMs);
}


interface ProjectPackage {
  readonly name?: unknown;
  readonly scripts?: unknown;
}

function resolveNodeTestPlan(projectRoot: string): DevProcessSpec | undefined {
  const packagePath = resolve(projectRoot, 'package.json');

  if (!existsSync(packagePath)) {
    return undefined;
  }

  let projectPackage: ProjectPackage;
  try {
    projectPackage = JSON.parse(
      readFileSync(packagePath, 'utf8'),
    ) as ProjectPackage;
  } catch (error) {
    throw new ValidationCliError('package.json is not valid JSON.', {
      cause: error,
    });
  }

  if (
    projectPackage.scripts === null ||
    typeof projectPackage.scripts !== 'object' ||
    Array.isArray(projectPackage.scripts)
  ) {
    throw new ValidationCliError('package.json must define a scripts object.');
  }

  const scripts = projectPackage.scripts as Record<string, unknown>;
  if (typeof scripts.test !== 'string') {
    throw new ValidationCliError(
      'This Node.js project does not define a test script. Add a package.json test script before using `stellarforge test`.',
    );
  }

  // npm treats a present-but-empty test script as a successful no-op, which
  // would report success without running any tests.
  if (scripts.test.trim().length === 0) {
    throw new ValidationCliError(
      'This Node.js project defines an empty package.json test script. Add a non-empty test script before using `stellarforge test`.',
    );
  }

  const projectName =
    typeof projectPackage.name === 'string' && projectPackage.name.length > 0
      ? projectPackage.name
      : 'app';

  const npm = createNpmInvocation(['run', 'test']);

  return {
    label: `${projectName}:test`,
    command: npm.command,
    args: npm.args,
    cwd: projectRoot,
  };
}

function resolveCargoTestPlan(projectRoot: string): DevProcessSpec | undefined {
  if (!existsSync(resolve(projectRoot, 'Cargo.toml'))) {
    return undefined;
  }

  return {
    label: 'cargo:test',
    command: process.platform === 'win32' ? 'cargo.exe' : 'cargo',
    args: ['test'],
    cwd: projectRoot,
  };
}

export function resolveTestProcessPlan(cwd: string): readonly DevProcessSpec[] {
  const projectRoot = resolve(cwd);
  const nodePlan = resolveNodeTestPlan(projectRoot);

  if (nodePlan !== undefined) {
    return [nodePlan];
  }

  const cargoPlan = resolveCargoTestPlan(projectRoot);
  if (cargoPlan !== undefined) {
    return [cargoPlan];
  }

  throw new ValidationCliError(
    'No supported StellarForge test workflow was found. Expected a package.json test script or a Cargo.toml workspace.',
  );
}
