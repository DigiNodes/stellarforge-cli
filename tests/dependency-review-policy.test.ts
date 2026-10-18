import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const workflow = readFileSync(
  join(root, '.github/workflows/dependency-review.yml'),
  'utf8',
).replace(/\r\n/g, '\n');
const policy = readFileSync(
  join(root, 'docs/contributing/dependency-policy.md'),
  'utf8',
);

// A strict, intentionally small YAML subset avoids a new parser dependency.
// Compare the whole executable shape: isolated regex checks could miss an
// override, second trigger, skip condition, or extra step elsewhere in the file.
// Changes to this contract require a corresponding policy/security review.
const expected = `name: Dependency Review
on:
  pull_request:
permissions:
  contents: read
jobs:
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Review dependency changes
        uses: actions/dependency-review-action@REVIEWED_SHA
        with:
          fail-on-severity: high`;

function conforms(source: string): boolean {
  if (
    !/^ {8}uses: actions\/dependency-review-action@[a-f0-9]{40}(?:\s+#.*)?\r?$/m.test(
      source,
    )
  ) {
    return false;
  }
  const normalized = source
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, '').trimEnd())
    .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))
    .join('\n')
    .replace(
      /actions\/dependency-review-action@[a-f0-9]{40}(?=\n)/g,
      'actions/dependency-review-action@REVIEWED_SHA',
    );
  return normalized === expected;
}

describe('Dependency Review policy conformance', () => {
  it('keeps the complete workflow unprivileged, mandatory and high-severity gated', () => {
    expect(conforms(workflow)).toBe(true);
  });

  it('accepts comments and line endings without changing executable settings', () => {
    expect(conforms(`# Review-only workflow\n${workflow}`)).toBe(true);
    expect(conforms(workflow.replace(/\r?\n/g, '\r\n'))).toBe(true);
  });

  it.each([
    ['privileged trigger', '  pull_request:', '  pull_request_target:'],
    [
      'path filter',
      '  pull_request:',
      '  pull_request:\n    paths: [package.json]',
    ],
    [
      'branch filter',
      '  pull_request:',
      '  pull_request:\n    branches: [main]',
    ],
    [
      'restricted events',
      '  pull_request:',
      '  pull_request:\n    types: [opened]',
    ],
    ['write permission', '  contents: read', '  contents: write'],
    [
      'blanket write permission',
      'permissions:\n  contents: read',
      'permissions: write-all',
    ],
    [
      'job override',
      '    steps:',
      '    permissions:\n      contents: write\n    steps:',
    ],
    [
      'critical-only threshold',
      'fail-on-severity: high',
      'fail-on-severity: critical',
    ],
    ['removed gate', '          fail-on-severity: high', ''],
    ['skipped job', '    steps:', '    if: false\n    steps:'],
    [
      'ignored failure',
      '    steps:',
      '    continue-on-error: true\n    steps:',
    ],
    [
      'extra action input',
      '        with:',
      '        with:\n          allow-ghsas: GHSA-example',
    ],
    [
      'added execution step',
      '    steps:',
      '    steps:\n      - run: gh pr merge --auto',
    ],
  ])('rejects %s', (_name, from, to) => {
    expect(workflow).toContain(from);
    expect(conforms(workflow.replace(from, to))).toBe(false);
  });

  it.each(['v5', 'REVIEWED_SHA'])(
    'rejects unpinned action reference %s',
    (ref) => {
      const unpinned = workflow.replace(
        /actions\/dependency-review-action@[a-f0-9]{40}/,
        `actions/dependency-review-action@${ref}`,
      );
      expect(unpinned).not.toBe(workflow);
      expect(conforms(unpinned)).toBe(false);
    },
  );

  it('documents the enforced settings and maintainer responsibilities', () => {
    for (const setting of [
      '`pull_request`',
      '`contents: read`',
      '`dependency-review`',
      '`ubuntu-latest`',
      '10-minute timeout',
      '`actions/dependency-review-action`',
      '40-character commit SHA',
      '`fail-on-severity: high`',
    ]) {
      expect(policy).toContain(setting);
    }
    expect(policy).toContain('high and critical');
    expect(policy).toContain('no branch or path filters');
    expect(policy).toContain('absent or skipped result is not a pass');
    expect(policy).toContain('supply-chain/security maintainer review');
    expect(policy).toContain('introduces no auto-merge behavior');
  });
});
