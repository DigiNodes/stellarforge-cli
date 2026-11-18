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
  const changedDependencies = [];
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
      changedDependencies.push(name);
    }
  }

  if (changedVersions === 0) {
    return deny('package.json contains no dependency version changes');
  }
  return {
    allowed: true,
    kind: 'npm-dependencies',
    changedVersions,
    changedDependencies,
  };
}

function resolveLockDependency(fromPath, dependencyName, packages) {
  let current = fromPath;
  while (true) {
    const candidate = current
      ? current + '/node_modules/' + dependencyName
      : 'node_modules/' + dependencyName;
    if (Object.hasOwn(packages, candidate)) return candidate;

    const marker = '/node_modules/';
    const markerIndex = current.lastIndexOf(marker);
    if (markerIndex >= 0) {
      current = current.slice(0, markerIndex);
    } else if (current.startsWith('node_modules/')) {
      current = '';
    } else {
      break;
    }
  }
  return null;
}

function collectLockDependencyClosure(lock, dependencyNames) {
  const packages = lock.packages;
  const reachable = new Set();
  const visit = (packagePath) => {
    if (reachable.has(packagePath)) return;
    reachable.add(packagePath);
    const metadata = packages[packagePath];
    if (!isObject(metadata)) return;

    const names = new Set([
      ...Object.keys(metadata.dependencies || {}),
      ...Object.keys(metadata.optionalDependencies || {}),
      ...Object.keys(metadata.peerDependencies || {}),
    ]);
    for (const name of names) {
      const resolved = resolveLockDependency(packagePath, name, packages);
      if (resolved) visit(resolved);
    }
  };

  for (const name of dependencyNames) {
    const resolved = resolveLockDependency('', name, packages);
    if (!resolved) {
      return {
        allowed: false,
        reason: 'package-lock.json is missing changed direct dependency "' + name + '"',
      };
    }
    visit(resolved);
  }
  return { allowed: true, reachable };
}

function validatePackageLock(
  baseLock,
  headLock,
  basePackage,
  headPackage,
  changedDependencies,
) {
  if (
    !isObject(baseLock) ||
    !isObject(headLock) ||
    baseLock.lockfileVersion !== 3 ||
    headLock.lockfileVersion !== 3 ||
    !isObject(baseLock.packages) ||
    !isObject(headLock.packages) ||
    !isObject(baseLock.packages['']) ||
    !isObject(headLock.packages[''])
  ) {
    return deny('package-lock.json must be a valid npm lockfile v3 at base and head');
  }

  const sections = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ];
  for (const [packagePath, metadata] of Object.entries(baseLock.packages)) {
    if (!isObject(metadata)) {
      return deny('package-lock package entries must be JSON objects');
    }
    for (const section of [
      'dependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      if (
        Object.hasOwn(metadata, section) &&
        !isObject(metadata[section])
      ) {
        return deny(
          'package-lock ' + section + ' entries must remain JSON objects',
        );
      }
    }
  }
  for (const [packagePath, metadata] of Object.entries(headLock.packages)) {
    if (!isObject(metadata)) {
      return deny('package-lock package entries must be JSON objects');
    }
    for (const section of [
      'dependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      if (
        Object.hasOwn(metadata, section) &&
        !isObject(metadata[section])
      ) {
        return deny(
          'package-lock ' + section + ' entries must remain JSON objects',
        );
      }
    }
  }
  for (const [lock, manifest] of [
    [baseLock, basePackage],
    [headLock, headPackage],
  ]) {
    const root = lock.packages[''];
    if (root.name !== manifest.name || root.version !== manifest.version) {
      return deny('package-lock root identity must match package.json');
    }
    for (const section of sections) {
      const expected = manifest[section] || {};
      const actual = root[section] || {};
      if (!sameJson(expected, actual)) {
        return deny('package-lock root ' + section + ' must exactly match package.json');
      }
    }
  }

  const baseRoot = { ...baseLock.packages[''] };
  const headRoot = { ...headLock.packages[''] };
  for (const section of sections) {
    delete baseRoot[section];
    delete headRoot[section];
  }
  if (!sameJson(baseRoot, headRoot)) {
    return deny('package-lock root metadata may not change outside dependency sections');
  }

  const baseTopLevel = { ...baseLock };
  const headTopLevel = { ...headLock };
  delete baseTopLevel.packages;
  delete headTopLevel.packages;
  if (!sameJson(baseTopLevel, headTopLevel)) {
    return deny('package-lock metadata may not change outside the package graph');
  }

  const baseClosure = collectLockDependencyClosure(baseLock, changedDependencies);
  if (!baseClosure.allowed) return deny(baseClosure.reason);
  const headClosure = collectLockDependencyClosure(headLock, changedDependencies);
  if (!headClosure.allowed) return deny(headClosure.reason);
  const allowedPaths = new Set([
    ...baseClosure.reachable,
    ...headClosure.reachable,
  ]);

  const paths = new Set([
    ...Object.keys(baseLock.packages),
    ...Object.keys(headLock.packages),
  ]);
  for (const packagePath of paths) {
    if (packagePath === '') continue;
    const before = baseLock.packages[packagePath];
    const after = headLock.packages[packagePath];
    if (!allowedPaths.has(packagePath)) {
      if (!sameJson(before, after)) {
        return deny(
          'package-lock.json changes package entries outside the updated direct-dependency closure',
        );
      }
      continue;
    }

    if (before && after && before.version === after.version) {
      if (!sameJson(before, after)) {
        return deny(
          'package-lock entries may not change metadata without changing the package version',
        );
      }
      continue;
    }
    if (after) {
      if (
        typeof after.resolved !== 'string' ||
        !after.resolved.startsWith('https://registry.npmjs.org/') ||
        typeof after.integrity !== 'string' ||
        after.integrity.length === 0
      ) {
        return deny(
          'new or updated lockfile packages must use the npm registry and include integrity metadata',
        );
      }
    }
  }

  return { allowed: true };
}

function normalizeWorkflowSource(source) {
  const lines = source.split(/\r?\n/);
  const references = [];
  let blockScalarIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indentation = line.match(/^ */)[0].length;
    const trimmed = line.trim();

    if (blockScalarIndent !== null) {
      if (trimmed === '' || indentation > blockScalarIndent) continue;
      blockScalarIndent = null;
    }

    if (
      /^\s*(?:-\s*)?[A-Za-z0-9_.-]+:\s*[|>](?:[+-]?\d?|\d?[+-])?(?:\s+#.*)?$/.test(
        line,
      )
    ) {
      blockScalarIndent = indentation;
      continue;
    }

    const match = line.match(
      /^(\s*(?:-\s*)?uses:\s*)([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})(\s+#.*)?$/i,
    );
    if (!match) continue;

    references.push({
      name: match[2],
      sha: match[3].toLowerCase(),
    });
    lines[index] = match[1] + match[2] + '@<SHA>' + (match[4] || '');
  }

  return { normalized: lines.join('\n'), references };
}

function validateWorkflowPatches(files, workflowContents) {
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
        'workflow source is unavailable at base or head; failing closed because changed lines cannot be verified',
      );
    }

    const before = normalizeWorkflowSource(revisions.base);
    const after = normalizeWorkflowSource(revisions.head);
    if (before.normalized !== after.normalized) {
      return deny(
        'workflow updates may change only pinned action SHAs outside YAML block-scalar content',
      );
    }
    if (before.references.length !== after.references.length) {
      return deny('workflow updates may not add or remove action references');
    }

    for (let index = 0; index < before.references.length; index += 1) {
      const oldReference = before.references[index];
      const newReference = after.references[index];
      if (oldReference.name !== newReference.name) {
        return deny('workflow updates may not replace or move action identities');
      }
      if (oldReference.sha !== newReference.sha) changedReferences += 1;
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
  baseLock,
  headLock,
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
    const lock = validatePackageLock(
      baseLock,
      headLock,
      basePackage,
      headPackage,
      manifest.changedDependencies,
    );
    if (!lock.allowed) return lock;
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
