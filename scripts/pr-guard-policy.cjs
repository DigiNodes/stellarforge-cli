'use strict';

const DEPENDABOT_LOGIN = 'dependabot[bot]';
const DEPENDENCY_TITLE = /^(?:build|chore)\(deps(?:-dev)?\):\s+/i;
const WORKFLOW_PATH =
  /^\.github\/workflows\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.ya?ml$/;
const VERSION_RANGE_CLAUSE =
  /^(?:[~^=]|>=?|<=?)?\s*\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function isVersionRange(value) {
  if (typeof value !== 'string' || value.length > 128) return false;
  const clauses = value.split('||');
  return (
    clauses.length <= 8 &&
    clauses.every((clause) => VERSION_RANGE_CLAUSE.test(clause.trim()))
  );
}

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
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function validatePackageManifest(basePackage, headPackage) {
  if (!isObject(basePackage) || !isObject(headPackage)) {
    return deny('package.json could not be parsed at both base and head revisions');
  }

  const sections = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ];
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
    const beforePresent = Object.hasOwn(basePackage, section);
    const afterPresent = Object.hasOwn(headPackage, section);
    if (beforePresent !== afterPresent) {
      return deny('dependency sections must retain their original presence');
    }
    const before = beforePresent ? basePackage[section] : {};
    const after = afterPresent ? headPackage[section] : {};
    if ((beforePresent && !isObject(before)) || (afterPresent && !isObject(after))) {
      return deny('present dependency sections must remain JSON objects');
    }

    const beforeNames = Object.keys(before).sort();
    const afterNames = Object.keys(after).sort();
    if (!sameJson(beforeNames, afterNames)) {
      return deny('Dependabot may update existing dependency ranges but may not add or remove dependency names');
    }

    for (const name of beforeNames) {
      if (before[name] === after[name]) continue;
      if (!isVersionRange(before[name]) || !isVersionRange(after[name])) {
        return deny(
          'dependency "' + name + '" changed to a non-semver or non-string specification',
        );
      }
      changedVersions += 1;
    }
  }

  if (changedVersions === 0) {
    return deny('package.json contains no dependency version changes');
  }
  return { allowed: true, kind: 'npm-dependencies', changedVersions };
}

function collectWorkflowUses(value, path = [], references = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectWorkflowUses(item, [...path, String(index)], references),
    );
    return references;
  }
  if (!isObject(value)) return references;

  if (Object.hasOwn(value, 'uses')) {
    if (typeof value.uses !== 'string') {
      throw new Error('workflow uses fields must be strings');
    }
    references[JSON.stringify([...path, 'uses'])] = value.uses;
  }

  for (const [key, child] of Object.entries(value)) {
    collectWorkflowUses(child, [...path, key], references);
  }
  return references;
}

function normalizeWorkflowUses(value) {
  if (Array.isArray(value)) return value.map(normalizeWorkflowUses);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [
        key,
        key === 'uses' ? '__PINNED_ACTION_REFERENCE__' : normalizeWorkflowUses(value[key]),
      ]),
  );
}

function validateWorkflowPatches(files, workflowContents) {
  const YAML = require('yaml');
  let changedReferences = 0;

  for (const file of files) {
    if (!WORKFLOW_PATH.test(file.filename) || file.status !== 'modified') {
      return deny('only modified workflow YAML files are allowed for GitHub Actions updates');
    }
    const revisions = workflowContents?.[file.filename];
    if (
      !revisions ||
      typeof revisions.base !== 'string' ||
      typeof revisions.head !== 'string'
    ) {
      return deny(
        'workflow source is unavailable at base or head; failing closed because YAML structure cannot be verified',
      );
    }

    let baseWorkflow;
    let headWorkflow;
    try {
      baseWorkflow = YAML.parse(revisions.base);
      headWorkflow = YAML.parse(revisions.head);
    } catch {
      return deny('workflow YAML must parse successfully at both base and head revisions');
    }
    if (!isObject(baseWorkflow) || !isObject(headWorkflow)) {
      return deny('workflow documents must remain YAML mappings');
    }

    let baseReferences;
    let headReferences;
    try {
      baseReferences = collectWorkflowUses(baseWorkflow);
      headReferences = collectWorkflowUses(headWorkflow);
    } catch (error) {
      return deny(error.message);
    }

    const baseLocations = Object.keys(baseReferences).sort();
    const headLocations = Object.keys(headReferences).sort();
    if (!sameJson(baseLocations, headLocations)) {
      return deny('workflow updates may not add, remove, or move action uses fields');
    }

    for (const location of baseLocations) {
      const before = baseReferences[location];
      const after = headReferences[location];
      if (before === after) continue;

      const beforeMatch = before.match(
        /^([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})$/i,
      );
      const afterMatch = after.match(
        /^([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})$/i,
      );
      if (
        !beforeMatch ||
        !afterMatch ||
        beforeMatch[1] !== afterMatch[1] ||
        beforeMatch[2].toLowerCase() === afterMatch[2].toLowerCase()
      ) {
        return deny(
          'workflow updates may change only the pinned SHA of an existing action at the same YAML location',
        );
      }
      changedReferences += 1;
    }

    if (
      !sameJson(
        normalizeWorkflowUses(baseWorkflow),
        normalizeWorkflowUses(headWorkflow),
      )
    ) {
      return deny('workflow updates may not change YAML content outside pinned action SHAs');
    }
  }

  if (changedReferences === 0) {
    return deny('workflow YAML contains no action-reference SHA changes');
  }
  return { allowed: true, kind: 'github-actions', changedFiles: files.length };
}

function classifyDependabotPR({
  login,
  title,
  baseRef,
  files,
  basePackage,
  headPackage,
  workflowContents,
}) {
  if (login !== DEPENDABOT_LOGIN) {
    return deny('only the exact dependabot[bot] account is eligible');
  }
  if (baseRef !== 'main') {
    return deny('Dependabot updates are allowed only when targeting main');
  }
  if (typeof title !== 'string' || !DEPENDENCY_TITLE.test(title)) {
    return deny('PR title must use the standard build(deps): or chore(deps): prefix');
  }
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.some((file) => file.status !== 'modified')
  ) {
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
    return validateWorkflowPatches(files, workflowContents);
  }

  return deny(
    'allowed Dependabot scope is exactly package.json + package-lock.json, or workflow YAML action-reference lines only',
  );
}

/* global module */
module.exports = { classifyDependabotPR };
