import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const config = readFileSync(join(root, '.github', 'dependabot.yml'), 'utf8');
const policy = readFileSync(
  join(root, 'docs', 'contributing', 'dependency-policy.md'),
  'utf8',
);

describe('Dependabot grouping policy alignment', () => {
  type UpdateBlock = {
    ecosystem: string;
    body: string;
    groupName: string;
  };

  const configBlocks = config.split(/\n\s*-\s*package-ecosystem:/).slice(1);

  const blocks: UpdateBlock[] = configBlocks.map((segment) => {
    const lines = segment.split('\n');
    const firstLine = lines[0];
    const rest = lines.slice(1);
    const ecosystem = firstLine?.trim() ?? '';
    const body = rest.join('\n');

    // Extract group name (npm-minor-and-patch or github-actions-minor-and-patch)
    let groupName = '';
    if (ecosystem === 'npm') {
      if (body.includes('npm-minor-and-patch')) {
        groupName = 'npm-minor-and-patch';
      }
    } else if (ecosystem === 'github-actions') {
      if (body.includes('github-actions-minor-and-patch')) {
        groupName = 'github-actions-minor-and-patch';
      }
    }

    return {
      ecosystem,
      body,
      groupName,
    };
  });

  it('defines npm and GitHub Actions update policies', () => {
    const ecosystems = blocks.map((b) => b.ecosystem);
    expect(ecosystems).toContain('npm');
    expect(ecosystems).toContain('github-actions');
  });

  it('uses weekly Monday cadence in Africa/Lagos with documented times and limits', () => {
    expect(config).toContain('interval: weekly');
    expect(config).toContain('day: monday');
    expect(config).toContain('timezone: Africa/Lagos');
    expect(config).toContain("time: '08:00'");
    expect(config).toContain("time: '08:30'");
    expect(config).toContain('open-pull-requests-limit: 5');
  });

  it('groups minor and patch updates only, isolating major updates', () => {
    for (const block of blocks) {
      expect(block.body).toMatch(/minor/);
      expect(block.body).toMatch(/patch/);
      // Major must not appear under update-types (or at all in the context of grouped updates)
      expect(block.body).not.toMatch(/- major\b/);
    }

    // Cross-check: no grouped major updates anywhere in the config
    expect(config).not.toMatch(/update-types:\s*[\s\S]*?- major\b/);
  });

  it('names the expected Dependabot groups', () => {
    const groupNames = blocks.map((b) => b.groupName);
    expect(groupNames).toContain('npm-minor-and-patch');
    expect(groupNames).toContain('github-actions-minor-and-patch');
  });

  it('does not introduce auto-merge for Dependabot PRs', () => {
    expect(config).not.toMatch(/auto-merge|automerge|auto_merge/i);
    expect(policy).toMatch(/No auto-merge policy is enabled/i);
  });

  it('documents the Dependabot policy accurately in the dependency policy', () => {
    expect(policy).toContain('npm-minor-and-patch');
    expect(policy).toContain('github-actions-minor-and-patch');
    expect(policy).toMatch(
      /weekly on Mondays in the `Africa\/Lagos` timezone/i,
    );
    expect(policy).toContain('08:00');
    expect(policy).toContain('08:30');
    expect(policy).toMatch(/open pull-requests? limit of 5/i);
    expect(policy).toMatch(/major updates are intentionally excluded/i);
  });
});

// SW-180: a dependency-update PR (whether opened by Dependabot or anyone
// else) must still trigger the full required gate set on every supported
// Node runtime major, with no actor-based skip and no auto-merge anywhere.
describe('dependency update smoke policy (SW-180)', () => {
  const workflowsDir = join(root, '.github', 'workflows');
  const ciWorkflow = readFileSync(join(workflowsDir, 'ci.yml'), 'utf8');
  const e2eWorkflow = readFileSync(join(workflowsDir, 'e2e-smoke.yml'), 'utf8');
  const codeqlWorkflow = readFileSync(join(workflowsDir, 'codeql.yml'), 'utf8');
  const dependencyReviewWorkflow = readFileSync(
    join(workflowsDir, 'dependency-review.yml'),
    'utf8',
  );
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as { engines: { node: string } };

  const requiredGateWorkflows = {
    'ci.yml': ciWorkflow,
    'e2e-smoke.yml': e2eWorkflow,
    'codeql.yml': codeqlWorkflow,
    'dependency-review.yml': dependencyReviewWorkflow,
  };

  it('triggers every required gate workflow on pull_request with no actor-based skip', () => {
    for (const [name, contents] of Object.entries(requiredGateWorkflows)) {
      expect(contents, name).toMatch(/\bon:\s*\n(?:.*\n)*?\s*pull_request:?/);
      expect(contents, name).not.toMatch(/dependabot/i);
      expect(contents, name).not.toMatch(/github\.actor\s*!=/);
    }
  });

  it('declares a supported Node engine floor of 22 and ceiling before 25', () => {
    expect(packageJson.engines.node).toMatch(/>=\s*22\./);
    expect(packageJson.engines.node).toMatch(/<\s*25/);
  });

  it('runs the quality/typecheck/lint gate and the Node 22/24 platform matrix in ci.yml', () => {
    expect(ciWorkflow).toContain('node-version: ${{ env.NODE_VERSION }}');
    expect(ciWorkflow).toMatch(/node-version:\s*\$\{\{\s*matrix\.node\s*\}\}/);
    expect(ciWorkflow).toMatch(/node:\s*'22\.13\.0'/);
    expect(ciWorkflow).toMatch(/node:\s*'24'/);
    expect(ciWorkflow).toContain('npm test');
    expect(ciWorkflow).toContain('npm run build');
  });

  it('runs the E2E smoke gate across the same Node 22/24 matrix, not just the floor', () => {
    expect(e2eWorkflow).toMatch(/node:\s*\[\s*'22\.13\.0'\s*,\s*'24'\s*\]/);
    expect(e2eWorkflow).toContain('npm run build');
    expect(e2eWorkflow).toContain('npm run test:e2e');
  });

  it('never configures auto-merge in any workflow', () => {
    for (const contents of Object.values(requiredGateWorkflows)) {
      expect(contents).not.toMatch(/auto-merge|automerge|auto_merge/i);
    }
  });

  it('does not reduce dependency-review severity or weaken its unprivileged trigger', () => {
    expect(dependencyReviewWorkflow).not.toMatch(/pull_request_target/);
    expect(dependencyReviewWorkflow).toContain('fail-on-severity: high');
  });
});
