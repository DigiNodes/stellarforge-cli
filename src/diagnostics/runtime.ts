import { createNpmInvocation } from '../process/npm.js';
import type { DiagnosticCheck, DiagnosticResult } from './types.js';
import {
  classifyCommandResult,
  runCommand,
  type RunCommand,
} from './process.js';
import {
  compareVersions,
  isAtLeast,
  parseNumericVersion,
  type NumericVersion,
} from './version.js';

const MINIMUM_NODE: NumericVersion = { major: 22, minor: 13, patch: 0 };
const MAXIMUM_NODE_MAJOR = 25;
const MINIMUM_NPM: NumericVersion = { major: 10, minor: 9, patch: 0 };
const NODE_REMEDIATION = 'Install Node.js >=22.13.0 and <25.';
const NPM_REMEDIATION =
  'Install npm >=10.9.0 and ensure it is available on PATH.';

function failure(
  id: string,
  label: string,
  message: string,
  remediation: string,
): DiagnosticResult {
  return { id, label, status: 'fail', message, remediation };
}

export function createNodeDiagnostic(
  nodeVersion = process.versions.node,
): DiagnosticCheck {
  return {
    id: 'node',
    label: 'Node.js',
    run(): DiagnosticResult {
      const parsed = parseNumericVersion(nodeVersion);

      if (!parsed) {
        return failure(
          'node',
          'Node.js',
          'Could not determine a valid Node.js version.',
          NODE_REMEDIATION,
        );
      }

      if (
        !isAtLeast(parsed, MINIMUM_NODE) ||
        parsed.major >= MAXIMUM_NODE_MAJOR
      ) {
        return failure(
          'node',
          'Node.js',
          `Unsupported Node.js version ${nodeVersion}.`,
          NODE_REMEDIATION,
        );
      }

      return {
        id: 'node',
        label: 'Node.js',
        status: 'pass',
        message: `Supported version ${nodeVersion} detected.`,
      };
    },
  };
}

export function createNpmDiagnostic(
  execute: RunCommand = runCommand,
): DiagnosticCheck {
  return {
    id: 'npm',
    label: 'npm',
    run(): DiagnosticResult {
      const npm = createNpmInvocation(['--version']);
      const result = execute(npm.command, npm.args);

      if (classifyCommandResult(result) !== 'ok') {
        return failure(
          'npm',
          'npm',
          'npm is unavailable or could not be executed.',
          NPM_REMEDIATION,
        );
      }

      const version = result.stdout.trim();
      const parsed = parseNumericVersion(version);

      if (!parsed) {
        return failure(
          'npm',
          'npm',
          'npm returned an unrecognized version.',
          NPM_REMEDIATION,
        );
      }

      if (compareVersions(parsed, MINIMUM_NPM) < 0) {
        return failure(
          'npm',
          'npm',
          `Unsupported npm version ${version}.`,
          NPM_REMEDIATION,
        );
      }

      return {
        id: 'npm',
        label: 'npm',
        status: 'pass',
        message: `Supported version ${version} detected.`,
      };
    },
  };
}

export function createRuntimeDiagnostics(): readonly DiagnosticCheck[] {
  return [createNodeDiagnostic(), createNpmDiagnostic()];
}
