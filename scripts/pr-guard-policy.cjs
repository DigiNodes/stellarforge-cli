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
      if (
        typeof before[name] !== 'string' ||
        !isVersionRange(after[name])
      ) {
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

function validateWorkflowPatches(files) {
  let changedReferences = 0;

  for (const file of files) {
    if (!WORKFLOW_PATH.test(file.filename) || file.status !== 'modified') {
      return deny('only modified workflow YAML files are allowed for GitHub Actions updates');
    }
    if (typeof file.patch !== 'string' || file.patch.length === 0) {
      return deny(
        'workflow patch is unavailable; failing closed because changed lines cannot be verified',
      );
    }

    // Pair removed/added references inside each diff hunk, not across the
    // whole file. This prevents two actions from being swapped between steps
    // while their aggregate identities still appear unchanged.
    let hunkRemoved = [];
    let hunkAdded = [];
    let sawChangedLine = false;

    const validateHunk = () => {
      if (hunkRemoved.length === 0 && hunkAdded.length === 0) return true;
      if (hunkRemoved.length === 0 || hunkRemoved.length !== hunkAdded.length) {
        return false;
      }
      for (let index = 0; index < hunkRemoved.length; index += 1) {
        if (hunkRemoved[index].name !== hunkAdded[index].name) return false;
        if (hunkRemoved[index].sha === hunkAdded[index].sha) return false;
        changedReferences += 1;
      }
      hunkRemoved = [];
      hunkAdded = [];
      return true;
    };

    for (const line of file.patch.split(/\r?\n/)) {
      if (line.startsWith('@@')) {
        if (!validateHunk()) {
          return deny(
            'workflow updates may change an action SHA only at the same step; action identities cannot be swapped, moved, or replaced',
          );
        }
        continue;
      }
      if (
        !/^[+-]/.test(line) ||
        line.startsWith('+++') ||
        line.startsWith('---')
      ) {
        continue;
      }

      sawChangedLine = true;
      // GitHub Actions commonly renders YAML sequence entries as
      // "- uses: owner/action@<sha>". Also accept a direct "uses:" key.
      const match = line.match(
        /^[+-]\s*(?:-\s*)?uses:\s*([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})(?:\s+#.*)?$/i,
      );
      if (!match) {
        return deny(
          'workflow updates may change only pinned 40-character uses: action references',
        );
      }
      const reference = { name: match[1], sha: match[2].toLowerCase() };
      if (line.startsWith('-')) hunkRemoved.push(reference);
      else hunkAdded.push(reference);
    }

    if (!sawChangedLine || !validateHunk()) {
      return deny(
        'workflow updates must replace pinned action SHAs in-place without adding, removing, moving, or swapping steps',
      );
    }
  }

  if (changedReferences === 0) {
    return deny('workflow patch contains no action-reference changes');
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
    return validateWorkflowPatches(files);
  }

  return deny(
    'allowed Dependabot scope is exactly package.json + package-lock.json, or workflow YAML action-reference lines only',
  );
}

/* global module */
module.exports = { classifyDependabotPR };
