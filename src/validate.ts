/**
 * Local project validation contract (issue SW-201).
 *
 * Defines the findings surface the `stellarforge validate` command exposes:
 * a stable set of checks over the documented local project requirements,
 * each finding carrying a stable id, category, and `required` marker, and an
 * exit-code contract in which only *required*-check failures make the command
 * exit non-zero (`EXIT_CODES.diagnostic`, the same documented semantic the
 * doctor uses for "a diagnostic completed but required checks failed").
 *
 * Scope is deliberately narrow. Checks cover only requirements the repository
 * documents for a generated/supported local project:
 *
 *   1. at least one recognized manifest is present (`package.json` or
 *      `Cargo.toml`);
 *   2. an existing `package.json` is valid JSON with an object `scripts`
 *      field; its `scripts.test` entry is reported for visibility but is a
 *      warning only;
 *   3. an existing `Cargo.toml` is valid UTF-8 declaring `[package]` or
 *      `[workspace]`;
 *   4. an existing `stellarforge.config.json` passes the loader's own
 *      validation rules;
 *   5. no secret values or unnecessary absolute paths may appear in any
 *      finding: every value rendered into a message or remediation is
 *      sanitized, and file contents and values are never echoed.
 *
 * Paths are reported relative to the project root or as the bare manifest
 * name; the absolute root directory is never printed. Each message and
 * remediation is bounded (200 characters) like every other CLI diagnostic.
 */

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TextDecoder } from 'node:util';
import { loadProjectConfig } from './config/project.js';
import { CliError } from './errors/errors.js';
import { boundDiagnosticText } from './diagnostics/bounds.js';
import type { DiagnosticStatus } from './diagnostics/types.js';

/** Stable categories for project validation findings. */
export type ProjectValidationCategory =
  'project' | 'package-manifest' | 'cargo-manifest' | 'configuration';

/** Stable ids for project validation findings. */
export const PROJECT_VALIDATION_CHECK_IDS = {
  manifestPresent: 'project.manifest-present',
  packageJsonParseable: 'project.package-json.parseable',
  packageJsonScriptsTest: 'project.package-json.scripts-test',
  cargoTomlParseable: 'project.cargo-toml.parseable',
  configurationWellFormed: 'project.configuration.well-formed',
} as const;

export type ProjectValidationCheckId =
  (typeof PROJECT_VALIDATION_CHECK_IDS)[keyof typeof PROJECT_VALIDATION_CHECK_IDS];

export interface ProjectValidationFinding {
  readonly id: ProjectValidationCheckId;
  readonly category: ProjectValidationCategory;
  readonly required: boolean;
  readonly status: DiagnosticStatus;
  readonly label: string;
  readonly message: string;
  readonly remediation?: string;
}

export interface ProjectValidationSummary {
  readonly pass: number;
  readonly warn: number;
  readonly fail: number;
  readonly total: number;
  /** Number of failed findings whose check is required. */
  readonly requiredFailures: number;
}

export interface ProjectValidationReport {
  readonly results: readonly ProjectValidationFinding[];
  readonly summary: ProjectValidationSummary;
}

const MAX_FINDING_TEXT_LENGTH = 200;

function sanitize(value: string): string {
  return boundDiagnosticText(
    value
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    MAX_FINDING_TEXT_LENGTH,
  );
}

function finding(
  id: ProjectValidationCheckId,
  category: ProjectValidationCategory,
  required: boolean,
  status: DiagnosticStatus,
  label: string,
  message: string,
  remediation?: string,
): ProjectValidationFinding {
  const safeMessage = sanitize(message);
  const base: Omit<ProjectValidationFinding, 'remediation'> = {
    id,
    category,
    required,
    status,
    label: sanitize(label),
    message: safeMessage,
  };

  if (remediation === undefined) {
    return base;
  }

  return { ...base, remediation: sanitize(remediation) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFile(path: string): boolean {
  try {
    const stats = lstatSync(path);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function readTextFile(
  path: string,
): { ok: true; content: string } | { ok: false } {
  try {
    return { ok: true, content: readFileSync(path, 'utf8') };
  } catch {
    return { ok: false };
  }
}

function checkManifestPresent(root: string): ProjectValidationFinding {
  const hasNode = isFile(join(root, 'package.json'));
  const hasCargo = isFile(join(root, 'Cargo.toml'));

  if (hasNode || hasCargo) {
    const found = [
      hasNode ? 'package.json' : undefined,
      hasCargo ? 'Cargo.toml' : undefined,
    ]
      .filter((entry) => entry !== undefined)
      .join(' and ');
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.manifestPresent,
      'project',
      true,
      'pass',
      'project manifest present',
      `found ${found}`,
    );
  }

  return finding(
    PROJECT_VALIDATION_CHECK_IDS.manifestPresent,
    'project',
    true,
    'fail',
    'project manifest present',
    'no supported manifest was found in this directory; a StellarForge project requires a package.json or a Cargo.toml',
    'create or select the project you actually mean to work on, or generate one with `stellarforge new`',
  );
}

function checkPackageJsonParseable(root: string): ProjectValidationFinding {
  const path = join(root, 'package.json');

  if (!isFile(path)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
      'package-manifest',
      true,
      'pass',
      'package.json parseable',
      'package.json not present; check not applicable',
    );
  }

  const read = readTextFile(path);
  if (!read.ok) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
      'package-manifest',
      true,
      'fail',
      'package.json parseable',
      'package.json could not be read',
      'fix the file permissions or restore a valid package.json, then retry',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(read.content) as unknown;
  } catch {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
      'package-manifest',
      true,
      'fail',
      'package.json parseable',
      'package.json is not valid JSON',
      'restore valid JSON syntax in package.json, then retry',
    );
  }

  if (!isRecord(parsed)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
      'package-manifest',
      true,
      'fail',
      'package.json parseable',
      'package.json must contain a JSON object',
      'make package.json a single JSON object, then retry',
    );
  }

  if (!isRecord(parsed.scripts)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
      'package-manifest',
      true,
      'fail',
      'package.json parseable',
      'package.json does not declare an object "scripts" field',
      'add a "scripts" object to package.json, then retry',
    );
  }

  return finding(
    PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
    'package-manifest',
    true,
    'pass',
    'package.json parseable',
    'package.json is a valid JSON object with a "scripts" object',
  );
}

function checkPackageJsonScriptsTest(root: string): ProjectValidationFinding {
  const path = join(root, 'package.json');

  if (!isFile(path)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
      'package-manifest',
      false,
      'pass',
      'scripts.test present',
      'package.json not present; check not applicable',
    );
  }

  const read = readTextFile(path);
  if (!read.ok) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
      'package-manifest',
      false,
      'warn',
      'scripts.test present',
      'package.json could not be inspected for a test script; fix the file first',
    );
  }

  try {
    const parsed: unknown = JSON.parse(read.content);

    if (isRecord(parsed) && isRecord(parsed.scripts)) {
      const script = parsed.scripts.test;
      if (typeof script === 'string' && script.trim().length > 0) {
        return finding(
          PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
          'package-manifest',
          false,
          'pass',
          'scripts.test present',
          'package.json declares a non-empty test script',
        );
      }
    }
  } catch {
    // Defer to the required parseability check for the detailed failure.
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
      'package-manifest',
      false,
      'warn',
      'scripts.test present',
      'package.json could not be inspected for a test script; fix the file first',
    );
  }

  return finding(
    PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
    'package-manifest',
    false,
    'warn',
    'scripts.test present',
    'package.json does not declare a non-empty test script',
    'add a "scripts"."test" command to package.json so `stellarforge test` can run',
  );
}

function checkCargoTomlParseable(root: string): ProjectValidationFinding {
  const path = join(root, 'Cargo.toml');

  if (!isFile(path)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.cargoTomlParseable,
      'cargo-manifest',
      true,
      'pass',
      'Cargo.toml parseable',
      'Cargo.toml not present; check not applicable',
    );
  }

  let content: string;
  try {
    const bytes = readFileSync(path);
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.cargoTomlParseable,
      'cargo-manifest',
      true,
      'fail',
      'Cargo.toml parseable',
      'Cargo.toml is not valid UTF-8',
      'save Cargo.toml as UTF-8, then retry',
    );
  }

  if (!/\[(?:package|workspace)\]/.test(content)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.cargoTomlParseable,
      'cargo-manifest',
      true,
      'fail',
      'Cargo.toml parseable',
      'Cargo.toml does not declare a [package] or [workspace] section',
      'declare a [package] or [workspace] section in Cargo.toml, then retry',
    );
  }

  return finding(
    PROJECT_VALIDATION_CHECK_IDS.cargoTomlParseable,
    'cargo-manifest',
    true,
    'pass',
    'Cargo.toml parseable',
    'Cargo.toml is valid UTF-8 declaring a [package] or [workspace]',
  );
}

function checkConfigurationWellFormed(root: string): ProjectValidationFinding {
  const path = join(root, 'stellarforge.config.json');

  if (!existsSync(path)) {
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.configurationWellFormed,
      'configuration',
      true,
      'pass',
      'stellarforge.config.json well-formed',
      'stellarforge.config.json not present; check not applicable',
    );
  }

  try {
    loadProjectConfig(root);
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.configurationWellFormed,
      'configuration',
      true,
      'pass',
      'stellarforge.config.json well-formed',
      'stellarforge.config.json passes validation',
    );
  } catch (error) {
    const message =
      error instanceof CliError
        ? error.userMessage
        : 'stellarforge.config.json could not be validated';
    return finding(
      PROJECT_VALIDATION_CHECK_IDS.configurationWellFormed,
      'configuration',
      true,
      'fail',
      'stellarforge.config.json well-formed',
      message,
      'fix stellarforge.config.json, then retry',
    );
  }
}

interface ProjectValidationCheck {
  readonly id: ProjectValidationCheckId;
  readonly category: ProjectValidationCategory;
  readonly run: (root: string) => ProjectValidationFinding;
}

const CHECKS: readonly ProjectValidationCheck[] = [
  {
    id: PROJECT_VALIDATION_CHECK_IDS.manifestPresent,
    category: 'project',
    run: checkManifestPresent,
  },
  {
    id: PROJECT_VALIDATION_CHECK_IDS.packageJsonParseable,
    category: 'package-manifest',
    run: checkPackageJsonParseable,
  },
  {
    id: PROJECT_VALIDATION_CHECK_IDS.packageJsonScriptsTest,
    category: 'package-manifest',
    run: checkPackageJsonScriptsTest,
  },
  {
    id: PROJECT_VALIDATION_CHECK_IDS.cargoTomlParseable,
    category: 'cargo-manifest',
    run: checkCargoTomlParseable,
  },
  {
    id: PROJECT_VALIDATION_CHECK_IDS.configurationWellFormed,
    category: 'configuration',
    run: checkConfigurationWellFormed,
  },
];

export function runProjectValidationChecks(
  root: string,
): ProjectValidationReport {
  const resolvedRoot = resolve(root);
  const results = CHECKS.map((check) => {
    try {
      return check.run(resolvedRoot);
    } catch {
      return finding(
        check.id,
        check.category,
        true,
        'fail',
        'project validation internal error',
        'project validation could not inspect the directory safely',
      );
    }
  });

  const pass = results.filter((entry) => entry.status === 'pass').length;
  const warn = results.filter((entry) => entry.status === 'warn').length;
  const fail = results.filter((entry) => entry.status === 'fail').length;
  const requiredFailures = results.filter(
    (entry) => entry.required && entry.status === 'fail',
  ).length;

  return {
    results,
    summary: {
      pass,
      warn,
      fail,
      total: results.length,
      requiredFailures,
    },
  };
}

export function renderProjectValidationReport(
  report: ProjectValidationReport,
  output: { info(message: string): void },
): void {
  if (report.results.length === 0) {
    output.info('No project validation checks are registered yet.');
    return;
  }

  for (const result of report.results) {
    output.info(
      `[${result.status.toUpperCase()}] ${result.label}: ${result.message}`,
    );

    if (result.remediation) {
      output.info(`  Remediation: ${result.remediation}`);
    }
  }

  output.info(
    `Summary: ${report.summary.pass} passed, ${report.summary.warn} warnings, ${report.summary.fail} failed.`,
  );
  output.info(
    report.summary.requiredFailures > 0
      ? 'Result: required project checks failed.'
      : 'Result: project passes documented requirements.',
  );
}
