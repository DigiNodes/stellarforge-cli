import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { auditWorkflowDirectory } from '../scripts/audit-workflow-permissions.mjs';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/workflows',
);

describe('GHA least-privilege permissions audit (SW-105)', () => {
  it('accepts read-only PR workflow', () => {
    // audit single-file dirs by pointing at fixtures and filtering
    const all = auditWorkflowDirectory(fixtures);
    const hits = all.filter((v) => v.file === 'pr-ci-ok.yml');
    expect(hits).toEqual([]);
  });

  it('fails prohibited write-all on PR workflow', () => {
    const all = auditWorkflowDirectory(fixtures);
    expect(
      all.some(
        (v) =>
          v.file === 'pr-ci-bad-write-all.yml' && /write-all/.test(v.message),
      ),
    ).toBe(true);
  });

  it('fails contents: write on PR workflow', () => {
    const all = auditWorkflowDirectory(fixtures);
    expect(
      all.some(
        (v) =>
          v.file === 'pr-ci-bad-contents-write.yml' &&
          /contents:write|contents: write/i.test(v.message),
      ),
    ).toBe(true);
  });

  it('allows release job allowlisted writes', () => {
    const all = auditWorkflowDirectory(fixtures);
    // The fixture deliberately uses an unallowlisted workflow basename and
    // must not inherit production release exceptions.
    expect(
      all.some(
        (v) =>
          v.file === 'release-bad-id-token.yml' && /id-token/.test(v.message),
      ),
    ).toBe(true);
  });
});
