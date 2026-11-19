import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  type Stats,
} from 'node:fs';
import { resolve } from 'node:path';
import { ValidationCliError } from '../errors/errors.js';
import {
  validateIdentityAlias,
  validateStellarForgeConfig,
  type StellarForgeConfig,
} from './schema.js';

export const PROJECT_CONFIG_FILENAME = 'stellarforge.config.json';
const MAX_CONFIG_BYTES = 64 * 1024;

/**
 * Portable project-config filesystem policy:
 *
 * - the only accepted path is `<project root>/stellarforge.config.json`;
 * - the path must be a regular file; symlinks are rejected rather than
 *   followed, so a link can never redirect the loader outside the root;
 * - the opened descriptor is checked before reading, so a path swap between
 *   inspection and read cannot turn the read into a symlink escape;
 * - POSIX mode bits and ownership are deliberately not used as trust signals.
 *   The file is non-secret by design (version, network, identity alias), so
 *   permissive modes are valid and must not be rejected. Windows also reports
 *   synthetic POSIX bits, which cannot carry security meaning there;
 * - unreadable files fail with a content-free validation error;
 * - the CLI never changes permissions or ownership and never attempts to
 *   escalate privileges.
 *
 * `O_NOFOLLOW` is used where the platform exposes it. Where it does not
 * (notably Windows), the post-open path check keeps the same explicit symlink
 * boundary for the read path.
 */
const NOFOLLOW_FLAG: number =
  (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
const CONFIG_OPEN_FLAGS = fsConstants.O_RDONLY | NOFOLLOW_FLAG;

function assertRegularConfigFile(metadata: Stats): void {
  if (metadata.isSymbolicLink()) {
    throw new ValidationCliError(
      'stellarforge.config.json must be a regular project file, not a symbolic link.',
    );
  }

  if (!metadata.isFile()) {
    throw new ValidationCliError(
      'stellarforge.config.json must be a regular project file.',
    );
  }
}

function assertConfigSize(size: number): void {
  if (size > MAX_CONFIG_BYTES) {
    throw new ValidationCliError(
      'stellarforge.config.json is larger than the 64 KiB MVP limit.',
    );
  }
}

function isSymlinkOpenFailure(error: unknown): boolean {
  return (
    error instanceof Error && (error as NodeJS.ErrnoException).code === 'ELOOP'
  );
}

function readConfigFile(configPath: string): string {
  let descriptor: number | undefined;

  try {
    try {
      descriptor = openSync(configPath, CONFIG_OPEN_FLAGS);
    } catch (error) {
      // A link swapped in after the initial lstat() is reported with ELOOP on
      // platforms that support O_NOFOLLOW. Keep the symlink diagnostic stable.
      if (isSymlinkOpenFailure(error)) {
        throw new ValidationCliError(
          'stellarforge.config.json must be a regular project file, not a symbolic link.',
        );
      }
      throw error;
    }

    const opened = fstatSync(descriptor);
    assertRegularConfigFile(opened);
    assertConfigSize(opened.size);

    // The path is checked again after opening. On platforms without
    // O_NOFOLLOW this catches a link substituted before open(); the open
    // descriptor still pins the original file for the bytes read below.
    assertRegularConfigFile(lstatSync(configPath));

    return readFileSync(descriptor, 'utf8');
  } catch (error) {
    if (error instanceof ValidationCliError) {
      throw error;
    }

    // Never include the OS error text, path, or file contents in the message.
    throw new ValidationCliError(
      'Unable to inspect stellarforge.config.json.',
      {
        cause: error,
      },
    );
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // A close failure must not replace an already-produced result.
      }
    }
  }
}

/**
 * Best-effort JSON scanner that rejects duplicate object keys, including
 * escaped-equivalent spellings of the same key and duplicates at any depth.
 *
 * The scanner is intentionally fail-open: on any anomaly (unterminated
 * strings, stray tokens, trailing garbage) it stops checking and lets the
 * caller fall through to JSON.parse, which produces the stable, content-free
 * malformed-JSON error. The scanner never echoes values — only the offending
 * key name is reported, JSON-quoted so it cannot inject terminal control
 * sequences.
 */
class ScanAbort extends Error {}

function abort(): never {
  throw new ScanAbort('duplicate-key scan aborted');
}

function isWhitespace(char: string | undefined): boolean {
  return (
    char === ' ' || char === '\t' || char === '\n' || char === '\r'
  );
}

function skipWhitespace(raw: string, index: number): number {
  let position = index;
  while (position < raw.length && isWhitespace(raw[position])) {
    position += 1;
  }
  return position;
}

function decodeJsonString(
  raw: string,
  index: number,
): { text: string; end: number } {
  if (raw[index] !== '"') {
    abort();
  }

  const chars: string[] = [];
  let position = index + 1;

  while (position < raw.length) {
    const char = raw[position];

    if (char === '"') {
      return { text: chars.join(''), end: position + 1 };
    }

    if (char === '\\') {
      const escape = raw[position + 1];

      switch (escape) {
        case '"':
          chars.push('"');
          position += 2;
          break;
        case '\\':
          chars.push('\\');
          position += 2;
          break;
        case '/':
          chars.push('/');
          position += 2;
          break;
        case 'b':
          chars.push('\b');
          position += 2;
          break;
        case 'f':
          chars.push('\f');
          position += 2;
          break;
        case 'n':
          chars.push('\n');
          position += 2;
          break;
        case 'r':
          chars.push('\r');
          position += 2;
          break;
        case 't':
          chars.push('\t');
          position += 2;
          break;
        case 'u': {
          const hex = raw.slice(position + 2, position + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            abort();
          }

          const code = Number.parseInt(hex, 16);

          if (code >= 0xd800 && code <= 0xdbff) {
            const pairHex = raw.slice(position + 6, position + 12);
            const pairMatch = /^\\u([0-9a-fA-F]{4})$/.exec(pairHex);
            if (!pairMatch || pairMatch[1] === undefined) {
              abort();
            }

            const low = Number.parseInt(pairMatch[1], 16);
            if (low < 0xdc00 || low > 0xdfff) {
              abort();
            }

            chars.push(
              String.fromCodePoint(
                0x10000 + ((code - 0xd800) << 10 | (low - 0xdc00)),
              ),
            );
            position += 12;
          } else {
            chars.push(String.fromCodePoint(code));
            position += 6;
          }
          break;
        }
        default:
          abort();
      }
      continue;
    }

    if (char === undefined) {
      abort();
    }

    chars.push(char);
    position += 1;
  }

  abort();
}

const JSON_NUMBER_PREFIX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

function scanValue(raw: string, index: number): number {
  const position = skipWhitespace(raw, index);

  if (position >= raw.length) {
    abort();
  }

  const char = raw[position];

  if (char === '{') {
    return scanObject(raw, position);
  }

  if (char === '[') {
    return scanArray(raw, position);
  }

  if (char === '"') {
    return decodeJsonString(raw, position).end;
  }

  if (raw.startsWith('true', position)) {
    return position + 4;
  }

  if (raw.startsWith('false', position)) {
    return position + 5;
  }

  if (raw.startsWith('null', position)) {
    return position + 4;
  }

  const match = JSON_NUMBER_PREFIX.exec(raw.slice(position));
  if (match && match[0].length > 0) {
    return position + match[0].length;
  }

  abort();
}

function presentKeyMessage(key: string): string {
  const display =
    key.length <= 64 ? JSON.stringify(key) : `${JSON.stringify(key.slice(0, 64))}...`;
  return `stellarforge.config.json contains a duplicate key ${display}.`;
}

function scanObject(raw: string, index: number): number {
  let position = skipWhitespace(raw, index + 1);

  if (raw[position] === '}') {
    return position + 1;
  }

  const keys = new Set<string>();

  while (true) {
    position = skipWhitespace(raw, position);

    const decoded = decodeJsonString(raw, position);

    if (keys.has(decoded.text)) {
      throw new ValidationCliError(presentKeyMessage(decoded.text));
    }

    keys.add(decoded.text);

    position = skipWhitespace(raw, decoded.end);

    if (raw[position] !== ':') {
      abort();
    }

    position = scanValue(raw, position + 1);
    position = skipWhitespace(raw, position);

    if (raw[position] === ',') {
      position += 1;
      continue;
    }

    if (raw[position] === '}') {
      return position + 1;
    }

    abort();
  }
}

function scanArray(raw: string, index: number): number {
  let position = skipWhitespace(raw, index + 1);

  if (raw[position] === ']') {
    return position + 1;
  }

  while (true) {
    position = scanValue(raw, position);
    position = skipWhitespace(raw, position);

    if (raw[position] === ',') {
      position += 1;
      continue;
    }

    if (raw[position] === ']') {
      return position + 1;
    }

    abort();
  }
}

/**
 * Rejects duplicate object keys in raw config text before parsing. Returns
 * silently when the document is itself malformed (the caller lets JSON.parse
 * report that with the stable malformed-JSON error).
 */
function assertNoDuplicateJsonKeys(raw: string): void {
  try {
    const end = scanValue(raw, 0);

    if (skipWhitespace(raw, end) !== raw.length) {
      abort();
    }
  } catch (error) {
    if (error instanceof ValidationCliError) {
      throw error;
    }

    // Malformed or unsupported document shape: defer to JSON.parse.
  }
}

export interface ProjectConfigOverrides {
  readonly network?: string;
  readonly identity?: string;
}

export interface ResolvedProjectConfig {
  readonly network?: string;
  readonly identity?: string;
}

export function loadProjectConfig(cwd: string): StellarForgeConfig | undefined {
  const projectRoot = resolve(cwd);
  const configPath = resolve(projectRoot, PROJECT_CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return undefined;
  }

  let metadata: Stats;
  try {
    metadata = lstatSync(configPath);
  } catch (error) {
    throw new ValidationCliError(
      'Unable to inspect stellarforge.config.json.',
      { cause: error },
    );
  }

  assertRegularConfigFile(metadata);
  assertConfigSize(metadata.size);

  const text = readConfigFile(configPath);

  assertNoDuplicateJsonKeys(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    throw new ValidationCliError(
      'stellarforge.config.json is not valid JSON.',
      { cause: error },
    );
  }

  return validateStellarForgeConfig(parsed);
}

export function resolveProjectConfig(
  cwd: string,
  overrides: ProjectConfigOverrides = {},
): ResolvedProjectConfig {
  const projectConfig = loadProjectConfig(cwd);

  const identity =
    overrides.identity === undefined
      ? projectConfig?.identity
      : validateIdentityAlias(overrides.identity);
  const network = overrides.network ?? projectConfig?.network;

  return {
    ...(network === undefined ? {} : { network }),
    ...(identity === undefined ? {} : { identity }),
  };
}
