'use strict';

const DEPENDABOT_LOGIN = 'dependabot[bot]';
const DEPENDENCY_TITLE = /^(?:build|chore)\(deps(?:-dev)?\):\s+/i;
const WORKFLOW_PATH = /^\.github\/workflows\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.ya?ml$/;
const ACTION_REFERENCE_CHANGE = /^[+-]\\s*uses:\\s*([A-Za-z0-9_.-]+(?:\\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})(?:\\s+#.*)?$/i;\nconst VERSION_RANGE = /^(?:[~^=]|>=?|<=?)?\s*\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\s*\|\|\s*(?:[~^=]|>=?|<=?)?\s*\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)*$/;

function deny(reason) {
  return { allowed: false, reason };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function validatePackageManifest(basePackage, headPackage) {
  if (!isObject(basePackage) || !isObject(headPackage)) {
    return deny('package.json could not be parsed at both base and head revisions');
  }

  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const baseOutsideDependencies = { ...basePackage };
  const headOutsideDependencies = { ...headPackage };
  for (const section of sections) {
    delete baseOutsideDependencies[section];
    delete headOutsideDependencies[section];
  }
  if (!sameJson(baseOutsideDependencies, headOutsideDependencies)) {
    return deny('package.json changes outside dependency version sections are not allowed');
  }

  let changedVersions = 0;
  for (const section of sections) {
    const before = basePackage[section] || {};
    const after = headPackage[section] || {};
    if (!isObject(before) || !isObject(after)) {
      return deny('dependency sections must remain JSON objects');
    }
    const beforeNames = Object.keys(before).sort();
    const afterNames = Object.keys(after).sort();
    if (!sameJson(beforeNames, afterNames)) {
      return deny('Dependabot may update existing dependency ranges but may not add or remove dependency names');
    }
    for (const name of beforeNames) {
      if (before[name] === after[name]) continue;
      if (typeof before[name] !== 'string' || typeof after[name] !== 'string' || !VERSION_RANGE.test(after[name])) {
        return deny('dependency "' + name + '" changed to a non-semver or non-string specification');
      }
      changedVersions += 1;
    }
  }

  if (changedVersions === 0) {
    return deny('package.json contains no dependency version changes');
  }
  return { allowed: true, kind: 'npm-dependencies', changedVersions };
}

function validateWorkflowPatches(files) {
  const removed = [];
  const added = [];

  for (const file of files) {
    if (!WORKFLOW_PATH.test(file.filename) || file.status !== 'modified') {
      return deny('only modified workflow YAML files are allowed for GitHub Actions updates');
    }
    if (typeof file.patch !== 'string' || file.patch.length === 0) {
      return deny('workflow patch is unavailable; failing closed because changed lines cannot be verified');
    }
    const changedLines = file.patch
      .split(/\r?\n/)
      .filter((line) => /^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---'));
    if (changedLines.length === 0) {
      return deny('workflow patch contains no action-reference changes');
    }
    for (const line of changedLines) {
      const match = line.match(ACTION_REFERENCE_CHANGE);
      if (!match) {
        return deny('workflow updates may change only pinned 40-character uses: action references');
      }
      const reference = { name: match[1], sha: match[2].toLowerCase() };
      if (line.startsWith('-')) removed.push(reference);
      else added.push(reference);
    }
  }

  if (removed.length === 0 || removed.length !== added.length) {
    return deny('workflow updates must replace existing action references, not add or remove steps');
  }
  const oldNames = removed.map((reference) => reference.name).sort();
  const newNames = added.map((reference) => reference.name).sort();
  if (!sameJson(oldNames, newNames)) {
    return deny('workflow updates may change an action SHA but may not replace the action identity');
  }

  const names = [...new Set(oldNames)];
  for (const name of names) {
    const oldShas = removed.filter((reference) => reference.name === name).map((reference) => reference.sha).sort();
    const newShas = added.filter((reference) => reference.name === name).map((reference) => reference.sha).sort();
    if (sameJson(oldShas, newShas)) {
      return deny('workflow action ' + name + ' has no pinned SHA update');
    }
  }

  return { allowed: true, kind: 'github-actions', changedFiles: files.length };
}
function classifyDependabotPR({ login, title, files, basePackage, headPackage }) {
  if (login !== DEPENDABOT_LOGIN) {
    return deny('only the exact dependabot[bot] account is eligible');
  }
  if (typeof title !== 'string' || !DEPENDENCY_TITLE.test(title)) {
    return deny('PR title must use the standard build(deps): or chore(deps): prefix');
  }
  if (!Array.isArray(files) || files.length === 0 || files.some((file) => file.status !== 'modified')) {
    return deny('Dependabot PR must contain only modified, reviewable files');
  }

  const names = files.map((file) => file.filename).sort();
  const npmFiles = ['package-lock.json', 'package.json'];
  if (sameJson(names, npmFiles)) {
    const manifest = validatePackageManifest(basePackage, headPackage);
    if (!manifest.allowed) return manifest;
    return { ...manifest, kind: 'npm-dependencies' };
  }

  if (files.every((file) => WORKFLOW_PATH.test(file.filename))) {
    return validateWorkflowPatches(files);
  }

  return deny('allowed Dependabot scope is exactly package.json + package-lock.json, or workflow YAML action-reference lines only');
}

/* global module */
module.exports = { classifyDependabotPR };
