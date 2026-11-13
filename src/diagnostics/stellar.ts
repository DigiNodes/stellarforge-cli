import {
  classifyCommandResult,
  runCommand,
  type RunCommand,
} from './process.js';
import type { DiagnosticCheck, DiagnosticResult } from './types.js';
import { isAtLeast, parseNumericVersion } from './version.js';

// Protocol 27 is the current recommended Mainnet baseline in Stellar's
// software-version matrix. Keep this compatibility floor explicit and review
// it when StellarForge changes its supported network/tooling baseline.
const MINIMUM_STELLAR_CLI = { major: 27, minor: 1, patch: 0 } as const;
const STELLAR_CLI_INSTALL_URL =
  'https://developers.stellar.org/docs/tools/cli/install-cli';

function parseStellarVersion(output: string): string | null {
  const value = output.trim();
  // Accept an optional `v` prefix for compatibility, but require the version
  // itself to follow SemVer 2.0.0 identifier rules. In particular, suffix
  // identifiers must be non-empty and numeric prerelease identifiers cannot
  // contain leading zeroes. This prevents malformed CLI output from passing
  // merely because its numeric core is above the supported baseline.
  const match =
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

export function createStellarDiagnostic(
  execute: RunCommand = runCommand,
): DiagnosticCheck {
  return {
    id: 'stellar',
    label: 'Stellar CLI',
    run(): DiagnosticResult {
      // `stellar version --only-version` is the official machine-friendly
      // version command. It does not inspect identities, keys, or config.
      const result = execute('stellar', ['version', '--only-version']);

      if (classifyCommandResult(result) !== 'ok') {
        return {
          id: 'stellar',
          label: 'Stellar CLI',
          status: 'fail',
          message: 'Stellar CLI is unavailable or could not be executed.',
          remediation: `Install or update the official Stellar CLI (${STELLAR_CLI_INSTALL_URL}), then ensure \`stellar\` is on PATH and \`stellar version --only-version\` reports a version.`,
        };
      }

      const version = parseStellarVersion(result.stdout);
      const parsed = version ? parseNumericVersion(version) : null;

      if (!version || !parsed) {
        return {
          id: 'stellar',
          label: 'Stellar CLI',
          status: 'fail',
          message: 'Stellar CLI returned an unrecognized version.',
          remediation: `Run \`stellar version --only-version\`; if it does not report a semantic version, reinstall or update the official Stellar CLI (${STELLAR_CLI_INSTALL_URL}).`,
        };
      }

      if (!isAtLeast(parsed, MINIMUM_STELLAR_CLI)) {
        return {
          id: 'stellar',
          label: 'Stellar CLI',
          status: 'fail',
          message: `Unsupported Stellar CLI version ${version}.`,
          remediation: `Update the official Stellar CLI to >=27.1.0 (${STELLAR_CLI_INSTALL_URL}), then verify \`stellar version --only-version\` reports a supported version.`,
        };
      }

      return {
        id: 'stellar',
        label: 'Stellar CLI',
        status: 'pass',
        message: `Supported version ${version} detected.`,
      };
    },
  };
}
