import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateStellarForgeConfig } from '../src/config/schema.js';
import { resolveDevProcessPlan } from '../src/dev/project.js';
import { EXIT_CODES } from '../src/errors/index.js';
import {
  TEMPLATE_IDS,
  getTemplate,
} from '../src/generator/template-registry.js';
import { createNpmInvocation } from '../src/process/npm.js';
import { withTempDirectory } from './helpers/index.js';

const root = join(import.meta.dirname, '..');
const quickStart = readFileSync(
  join(root, 'docs', 'guides', 'quick-start.md'),
  'utf8',
);

const templateMatches = [...quickStart.matchAll(/--template ([a-z-]+)/g)];
const documentedTemplateIds = templateMatches.map((match) => match[1] ?? '');

describe('Quick Start documentation', () => {
  it('documents only implemented commands', () => {
    for (const command of [
      'stellarforge new',
      'stellarforge doctor',
      'stellarforge dev',
      'stellarforge test',
      'stellarforge deploy',
    ]) {
      expect(quickStart).toContain(command);
    }

    expect(quickStart).not.toContain('stellarforge add');
    expect(quickStart).not.toContain('remote template');
  });

  it('references only bundled template IDs and documents the default', () => {
    for (const templateId of documentedTemplateIds) {
      expect(TEMPLATE_IDS).toContain(templateId);
    }

    expect(documentedTemplateIds).toContain('api-service');
    expect(documentedTemplateIds).toContain('smart-contract');
    expect(documentedTemplateIds).toContain('full-stack');
    expect(quickStart).toContain('The default template is `basic-app`');
    expect(getTemplate('basic-app').id).toBe('basic-app');
  });

  it('matches the implemented development script selection order', () =>
    withTempDirectory((projectRoot) => {
      const writeScripts = (scripts: Record<string, string>): void => {
        writeFileSync(
          join(projectRoot, 'package.json'),
          JSON.stringify({ name: 'quick-start-app', scripts }),
        );
      };

      expect(quickStart).toContain('`dev`, then `start`, then `start:backend`');

      writeScripts({ dev: 'a', start: 'b', 'start:backend': 'c' });
      expect(resolveDevProcessPlan(projectRoot)[0]?.args).toEqual(
        createNpmInvocation(['run', 'dev']).args,
      );

      writeScripts({ start: 'b', 'start:backend': 'c' });
      expect(resolveDevProcessPlan(projectRoot)[0]?.args).toEqual(
        createNpmInvocation(['run', 'start']).args,
      );

      writeScripts({ 'start:backend': 'c' });
      expect(resolveDevProcessPlan(projectRoot)[0]?.args).toEqual(
        createNpmInvocation(['run', 'start:backend']).args,
      );
    }));

  it('uses a configuration example that matches the schema', () => {
    const block = /```json\r?\n([\s\S]*?)```/.exec(quickStart);
    expect(block).not.toBeNull();

    const json = (block?.[1] ?? '').trim();
    const parsed: unknown = JSON.parse(json);
    expect(() => validateStellarForgeConfig(parsed)).not.toThrow();
    expect(parsed).toMatchObject({ version: 1, network: 'testnet' });
  });

  it('documents accurate Testnet and secret boundaries', () => {
    expect(quickStart).toContain(
      'A failed required diagnostic exits with code `5`.',
    );
    expect(EXIT_CODES.diagnostic).toBe(5);
    expect(quickStart).toContain('The MVP deployment path is Testnet-only.');
    expect(quickStart).toContain('Mainnet deployment is not implemented.');
    expect(quickStart).toContain(
      'Do not place raw secret keys or seed phrases in project configuration.',
    );
    expect(quickStart).not.toContain('defaults to Mainnet');
    expect(quickStart).not.toContain('default network is mainnet');
  });
});

describe('public documentation link integrity (SW-203)', () => {
  function walkMarkdown(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist'
      ) {
        continue;
      }
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkMarkdown(path));
      else if (entry.name.endsWith('.md')) out.push(path);
    }
    return out;
  }

  // The public surface under test: the front door, everything under docs/,
  // and the generated template READMEs that ship to npm. Paths are relative
  // to the repository root for readable failure messages.
  const publicDocs = [
    'README.md',
    ...walkMarkdown(join(root, 'docs')).map((path) =>
      path.slice(root.length + 1),
    ),
    ...walkMarkdown(join(root, 'templates')).map((path) =>
      path.slice(root.length + 1),
    ),
  ].sort();

  function stripCodeFences(text: string): string {
    const lines = text.split('\n');
    let inFence = false;
    return lines
      .map((line) => {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
          inFence = !inFence;
          return '';
        }
        return inFence ? '' : line;
      })
      .join('\n');
  }

  function slugify(headings: string): Set<string> {
    // A GitHub-compatible heading slugger: strips inline markup, lowercases,
    // drops everything outside letters/numbers/spaces/underscores/hyphens,
    // converts spaces to hyphens, and disambiguates duplicates with -N.
    const counts = new Map<string, number>();
    const anchors = new Set<string>();

    for (const raw of headings.split(/\r?\n/)) {
      const match = raw.trimEnd().match(/^(#{1,6})\s+(.*)$/);
      if (!match || !match[2]) {
        continue;
      }

      let slug = match[2]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N} _-]/gu, '')
        .replace(/\s+/g, '-');

      const occurrences = counts.get(slug) ?? 0;
      counts.set(slug, occurrences + 1);
      if (occurrences > 0) {
        slug = `${slug}-${occurrences}`;
      }
      anchors.add(slug);
    }

    return anchors;
  }

  function lineNumberOf(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  const EXTERNAL_SCHEME = /^(https?:|mailto:|ftp:|tel:|data:|javascript:)/i;
  const LINK_RE = /\[([^\]]*)\]\(([^)\s]+?)(\s+"[^"]*")?\)/g;

  it('covers the documented public surface deterministically', () => {
    expect(publicDocs.length).toBeGreaterThan(0);
    expect(publicDocs).toContain('README.md');
    for (const templateId of [
      'basic-app',
      'full-stack',
      'smart-contract',
      'api-service',
    ]) {
      expect(
        publicDocs.some((path) =>
          path
            .replace(/\\/g, '/')
            .includes(`templates/${templateId}/README.md`),
        ),
      ).toBe(true);
    }
    expect([...publicDocs].sort()).toEqual(publicDocs);
  });

  it('resolves every relative link and local anchor without network access', () => {
    const anchorCache = new Map<string, Set<string>>();
    const anchorsFor = (absolutePath: string) => {
      let cached = anchorCache.get(absolutePath);
      if (!cached) {
        cached = slugify(readFileSync(absolutePath, 'utf8'));
        anchorCache.set(absolutePath, cached);
      }
      return cached;
    };

    const failures: string[] = [];

    for (const rel of publicDocs) {
      const normalized = join(root, rel);
      const text = readFileSync(normalized, 'utf8');
      const scanned = stripCodeFences(text);
      const baseDir = join(root, dirname(rel));

      for (const match of scanned.matchAll(LINK_RE)) {
        const rawTarget = match[2];
        if (!rawTarget) {
          continue;
        }
        const index = match.index ?? 0;
        const line = lineNumberOf(scanned, index);

        if (EXTERNAL_SCHEME.test(rawTarget) || rawTarget.startsWith('//')) {
          // External URLs are explicitly out of scope and never fetched.
          continue;
        }

        let target: string;
        try {
          target = decodeURIComponent(rawTarget);
        } catch {
          // A percent sequence we cannot decode is itself broken.
          failures.push(`${rel}:${line} undecodable link target: ${rawTarget}`);
          continue;
        }

        const [pathPart = '', anchor] = target.split('#', 2);

        if (pathPart === '') {
          if (anchor && !anchorsFor(normalized).has(anchor)) {
            failures.push(`${rel}:${line} unknown local anchor: #${anchor}`);
          }
          continue;
        }

        const targetPath = resolve(baseDir, pathPart);

        if (!existsSync(targetPath)) {
          failures.push(`${rel}:${line} unresolved link target: ${pathPart}`);
          continue;
        }

        if (anchor && targetPath.endsWith('.md')) {
          if (!anchorsFor(targetPath).has(anchor)) {
            failures.push(
              `${rel}:${line} unknown anchor #${anchor} in ${pathPart}`,
            );
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('Clean-room installation and PATH troubleshooting documentation (SW-188)', () => {
  const installationDoc = readFileSync(
    join(root, 'docs', 'guides', 'installation.md'),
    'utf8',
  );
  const readmeDoc = readFileSync(join(root, 'README.md'), 'utf8');
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );

  it('accurately distinguishes global install, npx on-demand, and local package paths', () => {
    // Both installation guide and README reference the official package name and bin
    expect(installationDoc).toContain('@diginodes/stellarforge-cli');
    expect(installationDoc).toContain('stellarforge');
    expect(readmeDoc).toContain('@diginodes/stellarforge-cli');
    expect(readmeDoc).toContain('stellarforge');

    // Global install command
    expect(installationDoc).toContain(
      'npm install -g @diginodes/stellarforge-cli',
    );
    expect(readmeDoc).toContain('npm install -g @diginodes/stellarforge-cli');

    // On-demand npx invocation
    expect(installationDoc).toContain('npx @diginodes/stellarforge-cli');
    expect(readmeDoc).toContain('npx @diginodes/stellarforge-cli');

    // Local project dependency
    expect(installationDoc).toContain(
      'npm install --save-dev @diginodes/stellarforge-cli',
    );
  });

  it('covers PATH troubleshooting across Windows, macOS, and Linux at a high level', () => {
    expect(installationDoc).toContain('## PATH troubleshooting');
    expect(installationDoc).toContain('npm config get prefix');

    // Platform-specific coverage
    expect(installationDoc).toContain('macOS');
    expect(installationDoc).toContain('Linux');
    expect(installationDoc).toContain('Windows');

    // macOS/Linux diagnostics
    expect(installationDoc).toContain('which stellarforge');
    expect(installationDoc).toContain('echo "$PATH"');

    // Windows diagnostics
    expect(installationDoc).toContain('Get-Command stellarforge');
    expect(installationDoc).toContain('where stellarforge');
  });

  it('prohibits instructions that blindly edit shell startup files or expose secrets', () => {
    // Prohibits indiscriminate environment dumping commands
    expect(installationDoc).not.toContain('printenv');
    expect(installationDoc).not.toContain('Get-ChildItem env:');

    // Warns against blind edits to shell configuration files
    expect(installationDoc).toContain(
      'Do not edit shell configuration files blindly',
    );
  });

  it('verifies examples against actual package metadata and supported engines', () => {
    expect(installationDoc).toContain(packageJson.name);
    expect(Object.keys(packageJson.bin)).toContain('stellarforge');
    expect(installationDoc).toContain(packageJson.engines.node);
    expect(installationDoc).toContain(packageJson.engines.npm);
  });
});
