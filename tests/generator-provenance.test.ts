import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { hostname, userInfo } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_MARKER_FILENAME,
  GENERATOR_PACKAGE_NAME,
  generateProjectFromTemplate,
} from '../src/generator/template-generation.js';
import { resolveBundledTemplateRoot } from '../src/generator/template-sources.js';
import { TEMPLATE_IDS } from '../src/generator/template-registry.js';
import type { GenerationContext } from '../src/generator/types.js';
import { repositoryRoot } from './helpers/index.js';
import { withTempDirectory } from './helpers/index.js';

const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
) as { version: string };

function generate(root: string, templateId: string, generatorVersion?: string) {
  const destination = join(root, `demo-${templateId}`);
  const context: GenerationContext = {
    input: {
      projectName: destination.split(/[\\/]/).pop() ?? 'demo-app',
      cwd: root,
      templateId,
    },
    destination: {
      projectName: destination.split(/[\\/]/).pop() ?? 'demo-app',
      destination,
    },
    template: {
      templateId,
    },
  };

  return generateProjectFromTemplate(context, {
    templateRoot: resolveBundledTemplateRoot(templateId),
    generatorVersion,
  });
}

describe('generated project provenance marker', () => {
  it.each([...TEMPLATE_IDS])(
    'writes a stable marker for the %s template',
    (templateId) =>
      withTempDirectory((root) => {
        const result = generate(root, templateId);
        const markerPath = join(result.destination, GENERATED_MARKER_FILENAME);

        const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as unknown;

        expect(marker).toEqual({
          generator: GENERATOR_PACKAGE_NAME,
          template: templateId,
          version: packageJson.version,
        });
      }),
  );

  it('records only template id and generator version — no user, host, path, or environment', () =>
    withTempDirectory((root) => {
      const result = generate(root, 'basic-app');

      const raw = readFileSync(
        join(result.destination, GENERATED_MARKER_FILENAME),
        'utf8',
      );

      expect(raw).not.toContain(userInfo().username);
      expect(raw).not.toContain(hostname());
      expect(raw).not.toContain(root);
      expect(raw).not.toContain(process.env.USER ?? '__unset_user_marker__');
      expect(Object.keys(JSON.parse(raw) as object).sort()).toEqual([
        'generator',
        'template',
        'version',
      ]);
    }));

  it('is byte-stable apart from the version value', () =>
    withTempDirectory((root) =>
      withTempDirectory((first) => {
        generate(root, 'smart-contract', '9.9.9');
        generate(first, 'smart-contract', '9.9.9');

        const a = readFileSync(
          join(root, 'demo-smart-contract', GENERATED_MARKER_FILENAME),
          'utf8',
        );
        const b = readFileSync(
          join(first, 'demo-smart-contract', GENERATED_MARKER_FILENAME),
          'utf8',
        );

        expect(a).toBe(b);
        expect(a).toContain('"version": "9.9.9"');
        expect(a.endsWith('\n')).toBe(true);
        expect(a.startsWith('{\n  "generator"')).toBe(true);
      }),
    ));

  it('does not leak into the generated project git ignore or package files', () =>
    withTempDirectory((root) => {
      const result = generate(root, 'api-service', '0.0.0-test');
      const marker = readFileSync(
        join(result.destination, GENERATED_MARKER_FILENAME),
        'utf8',
      );

      // The marker carries no telemetry payload and is a plain JSON object.
      const parsed = JSON.parse(marker) as Record<string, unknown>;
      expect(typeof parsed.generator).toBe('string');
      expect(typeof parsed.template).toBe('string');
      expect(typeof parsed.version).toBe('string');
      expect(marker).not.toMatch(/SECRET|SEED|TOKEN|PASSPHRASE/i);
    }));
});
