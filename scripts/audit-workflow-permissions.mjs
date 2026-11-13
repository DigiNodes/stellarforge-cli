#!/usr/bin/env node
/* global process, console */
/**
 * SW-105 — GitHub Actions least-privilege permissions conformance audit.
 * Static check only. Does not modify workflow permissions.
 *
 * Usage:
 *   node scripts/audit-workflow-permissions.mjs [dir]
 * Default dir: .github/workflows
 * Exit 1 on violations.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Explicit per-job exceptions for workflows that must write. */
const JOB_PERMISSION_ALLOWLIST = {
  'release.yml': {
    version: new Set(['contents:write', 'pull-requests:write']),
    publish: new Set(['contents:write', 'id-token:write']),
  },
  'wave-stale-prs.yml': {
    stale: new Set(['issues:write']),
  },
  'codeql.yml': {
    analyze: new Set(['security-events:write']),
  },
  'scorecard.yml': {
    scorecard: new Set(['security-events:write', 'id-token:write']),
  },
  'wave-claim.yml': {
    guidance: new Set(['issues:write']),
  },
  'wave-intake.yml': {
    sync: new Set(['issues:write']),
  },
  'wave-pr-readiness.yml': {
    readiness: new Set(['issues:write']),
  },
};

function listYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(dir, f));
}

/**
 * Minimal line scanner for permissions maps. It intentionally supports only
 * the block-map syntax used by this repository's workflows; it is not a YAML
 * parser and must be paired with workflow YAML/actionlint validation.
 */
function extractPermissionBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentJob = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^jobs:\s*$/.test(line)) {
      currentJob = null;
      continue;
    }

    const jobMatch = line.match(/^[ ]{2}([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch && currentJob !== null || jobMatch && lines.slice(0, i).some((v) => /^jobs:\s*$/.test(v))) {
      currentJob = jobMatch[1];
    }

    const topPerm = line.match(/^permissions:\s*(.*)$/);
    const jobPerm = line.match(/^[ ]{4}permissions:\s*(.*)$/);
    const match = topPerm || jobPerm;
    if (!match) continue;

    const scope = topPerm ? 'top-level' : 'job';
    const entries = [];
    const rest = (match[1] || '').trim();

    if (rest === 'read-all' || rest === 'write-all' || rest === '{}') {
      entries.push({ key: rest === '{}' ? '<empty>' : rest, value: rest });
    } else if (rest.length === 0) {
      let j = i + 1;
      while (j < lines.length) {
        const entry = lines[j].match(/^[ ]{2,6}([A-Za-z0-9_-]+):\s*(\S+)\s*$/);
        if (!entry) break;
        entries.push({ key: entry[1], value: entry[2] });
        j++;
      }
      i = j - 1;
    }

    blocks.push({
      scope,
      job: scope === 'job' ? currentJob : null,
      entries,
      line: i + 1,
    });
  }
  return blocks;
}

function normalizePerm(key, value) {
  if (key === 'write-all' || value === 'write-all') return 'write-all';
  if (key === 'read-all' || value === 'read-all') return 'read-all';
  if (key === '<empty>' || value === '{}') return 'empty';
  return `${key}:${value}`;
}

function isElevated(permission) {
  if (permission === 'write-all') return true;
  if (permission === 'read-all' || permission === 'empty') return false;
  const value = permission.split(':')[1];
  return value === 'write' || value === 'admin';
}

function auditFile(filePath) {
  const base = path.basename(filePath);
  const blocks = extractPermissionBlocks(fs.readFileSync(filePath, 'utf8'));
  const violations = [];
  const allowlist = JOB_PERMISSION_ALLOWLIST[base] || {};

  if (blocks.length === 0) {
    return [{
      file: base,
      line: 1,
      message: 'missing explicit permissions block (declare minimal permissions)',
    }];
  }

  for (const block of blocks) {
    for (const { key, value } of block.entries) {
      const permission = normalizePerm(key, value);
      if (permission === 'write-all') {
        violations.push({
          file: base,
          line: block.line,
          message: `prohibited broad permissions: write-all (${block.scope})`,
        });
        continue;
      }
      if (!isElevated(permission)) continue;

      if (block.scope === 'top-level') {
        violations.push({
          file: base,
          line: block.line,
          message: `elevated permission ${permission} must be scoped to an allowlisted job`,
        });
        continue;
      }

      const allowed = allowlist[block.job || ''];
      if (!allowed || !allowed.has(permission)) {
        violations.push({
          file: base,
          line: block.line,
          message: `elevated permission ${permission} is not allowlisted for job "${block.job || ''}"`,
        });
      }
    }
  }
  return violations;
}

export function auditWorkflowDirectory(dir) {
  return listYamlFiles(dir).flatMap((file) => auditFile(file));
}

// CLI
const dir = process.argv[2] || path.join(process.cwd(), '.github/workflows');
const violations = auditWorkflowDirectory(dir);
if (violations.length) {
  console.error('Workflow permissions conformance FAILED:\n');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.line} ${violation.message}`);
  }
  process.exit(1);
}
console.log(`OK: least-privilege permissions audit passed (${dir})`);
