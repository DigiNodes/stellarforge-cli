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

function parseSemver(version) {
  if (typeof version !== 'string') return null;
  const match = version.match(
    /^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?(?:\\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : null,
  };
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease === null && b.prerelease === null) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\\d+$/.test(x);
    const yn = /^\\d+$/.test(y);
    if (xn && yn) return Number(x) < Number(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

function satisfiesVersionRange(version, range) {
  if (!parseSemver(version) || !isVersionRange(range)) return false;
  return range.split('||').some((rawClause) => {
    const match = rawClause.trim().match(
      /^(\\^|~|>=|>|<=|<|=)?\\s*(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)$/,
    );
    if (!match) return false;
    const operator = match[1] || '=';
    const required = match[2];
    const compared = compareSemver(version, required);
    if (compared === null) return false;
    if (operator === '=') return compared === 0;
    if (operator === '>') return compared > 0;
    if (operator === '>=') return compared >= 0;
    if (operator === '<') return compared < 0;
    if (operator === '<=') return compared <= 0;
    if (operator === '~') {
      const parsed = parseSemver(required);
      const upper = parsed.major + '.' + (parsed.minor + 1) + '.0';
      return compared >= 0 && compareSemver(version, upper) < 0;
    }
    const parsed = parseSemver(required);
    const upper =
      parsed.major > 0
        ? parsed.major + 1 + '.0.0'
        : parsed.minor > 0
          ? '0.' + (parsed.minor + 1) + '.0'
          : '0.0.' + (parsed.patch + 1);
    return compared >= 0 && compareSemver(version, upper) < 0;
  });
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

function packageNameFromLockPath(packagePath) {
  const segments = packagePath.split('/node_modules/').pop().split('/');
  return segments[0].startsWith('@')
    ? segments[0] + '/' + (segments[1] || '')
    : segments[0];
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
  registryMetadata,
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
  for (const metadata of Object.values(baseLock.packages)) {
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
  for (const metadata of Object.values(headLock.packages)) {
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

  // npm may keep a different resolved package version than the manifest
  // range appears to request. Verify the root's actual install target.
  for (const section of sections) {
    const requirements = headPackage[section] || {};
    for (const [name, range] of Object.entries(requirements)) {
      const packagePath = resolveLockDependency('', name, headLock.packages);
      const resolvedVersion = packagePath
        ? headLock.packages[packagePath]?.version
        : null;
      if (!packagePath || !satisfiesVersionRange(resolvedVersion, range)) {
        return deny(
          'package-lock resolved version for "' + name + '" does not satisfy package.json ' + section + ' range',
        );
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

  const productionReachable = collectLockDependencyClosure(headLock, [
    ...Object.keys(headPackage.dependencies || {}),
    ...Object.keys(headPackage.optionalDependencies || {}),
    ...Object.keys(headPackage.peerDependencies || {}),
  ]);
  const developmentReachable = collectLockDependencyClosure(
    headLock,
    Object.keys(headPackage.devDependencies || {}),
  );
  if (!productionReachable.allowed || !developmentReachable.allowed) {
    return deny('package-lock dependency graph could not be resolved');
  }

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
      const beforeWithoutDev = { ...before };
      const afterWithoutDev = { ...after };
      delete beforeWithoutDev.dev;
      delete afterWithoutDev.dev;
      if (!sameJson(beforeWithoutDev, afterWithoutDev)) {
        return deny(
          'package-lock entries may not change artifact metadata without changing the package version',
        );
      }
      const expectedDev =
        developmentReachable.reachable.has(packagePath) &&
        !productionReachable.reachable.has(packagePath);
      if ((after.dev === true) !== expectedDev) {
        return deny(
          'package-lock dev flag does not match the updated dependency graph',
        );
      }
      continue;
    }
    if (after) {
      const packageName = packageNameFromLockPath(packagePath);
      const trusted = registryMetadata?.[packageName + '@' + after.version];
      if (
        typeof after.version !== 'string' ||
        !/^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/.test(
          after.version,
        ) ||
        typeof after.resolved !== 'string' ||
        !after.resolved.startsWith('https://registry.npmjs.org/') ||
        typeof after.integrity !== 'string' ||
        after.integrity.length === 0 ||
        !trusted ||
        trusted.resolved !== after.resolved ||
        trusted.integrity !== after.integrity
      ) {
        return deny(
          'new or updated lockfile package tarball and integrity must match trusted npm registry metadata',
        );
      }
    }
  }

  // Every retained package must keep its required dependency edges intact.
  // Missing optional or peer dependencies can be valid; regular dependencies
  // cannot be left unresolved by deleting a shared lockfile entry.
  for (const [packagePath, metadata] of Object.entries(headLock.packages)) {
    if (!packagePath || metadata.link === true) continue;
    for (const dependencyName of Object.keys(metadata.dependencies || {})) {
      if (!resolveLockDependency(packagePath, dependencyName, headLock.packages)) {
        return deny(
          'package-lock deletion leaves required dependency "' +
            dependencyName +
            '" unresolved for ' +
            packagePath,
        );
      }
    }
  }

  return { allowed: true };
}

function hasClosingQuote(line, quote, startIndex) {
  for (let index = startIndex; index < line.length; index += 1) {
    if (quote === '"' && line[index] === '\\') {
      index += 1;
      continue;
    }
    if (
      quote === "'" &&
      line[index] === "'" &&
      line[index + 1] === "'"
    ) {
      index += 1;
      continue;
    }
    if (line[index] === quote) return true;
  }
  return false;
}

function normalizeWorkflowSource(source) {
  const { parseDocument, isMap, isSeq, isScalar } = require('yaml');
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length || !isMap(document.contents)) {
    return { normalized: null, references: [] };
  }

  const edits = [];
  const references = [];
  const valueFor = (mapping, key) => {
    if (!isMap(mapping)) return undefined;
    const pair = mapping.items.find(
      (item) => isScalar(item.key) && item.key.value === key,
    );
    return pair?.value;
  };
  const maskReference = (node, location) => {
    if (!isScalar(node) || typeof node.value !== 'string') return;
    const match = node.value.match(
      /^([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+)@([a-f0-9]{40})$/i,
    );
    if (!match || !Array.isArray(node.range)) return;
    const [valueStart, valueEnd] = node.range;
    const rawValue = source.slice(valueStart, valueEnd);
    const shaToken = '@' + match[2];
    const shaOffset = rawValue.lastIndexOf(shaToken);
    if (shaOffset < 0) return;

    const shaStart = valueStart + shaOffset + 1;
    const shaEnd = shaStart + match[2].length;
    edits.push({ start: shaStart, end: shaEnd, value: '<SHA>' });

    // Dependabot updates the adjacent version annotation with the SHA. Permit
    // only a canonical "# vX.Y.Z[-prerelease]" comment on this exact uses line.
    const nextLine = source.indexOf('\n', valueEnd);
    const lineEnd = nextLine < 0 ? source.length : nextLine;
    const trailing = source.slice(valueEnd, lineEnd);
    const comment = trailing.match(
      /^(\s+#\s*v)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(\s*)$/,
    );
    if (comment) {
      const versionStart = valueEnd + comment[1].length;
      const versionEnd = versionStart + comment[2].length;
      edits.push({ start: versionStart, end: versionEnd, value: '<VERSION>' });
    }

    references.push({
      location,
      name: match[1],
      sha: match[2].toLowerCase(),
    });
  };

  const jobs = valueFor(document.contents, 'jobs');
  if (!isMap(jobs)) return { normalized: null, references: [] };

  for (const jobPair of jobs.items) {
    if (!isScalar(jobPair.key) || typeof jobPair.key.value !== 'string') {
      return { normalized: null, references: [] };
    }
    const jobName = jobPair.key.value;
    const job = jobPair.value;
    if (!isMap(job)) continue;

    // Reusable workflow reference: jobs.<job_id>.uses
    maskReference(valueFor(job, 'uses'), 'jobs.' + jobName + '.uses');

    // Action step reference: jobs.<job_id>.steps[*].uses
    const steps = valueFor(job, 'steps');
    if (!isSeq(steps)) continue;
    for (let index = 0; index < steps.items.length; index += 1) {
      const step = steps.items[index];
      if (!isMap(step)) continue;
      maskReference(
        valueFor(step, 'uses'),
        'jobs.' + jobName + '.steps[' + index + '].uses',
      );
    }
  }

  let normalized = source;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    normalized =
      normalized.slice(0, edit.start) +
      edit.value +
      normalized.slice(edit.end);
  }
  return { normalized, references };
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
    if (
      before.normalized === null ||
      after.normalized === null
    ) {
      return deny('workflow YAML could not be parsed safely');
    }
    if (before.normalized !== after.normalized) {
      return deny(
        'workflow updates may change only pinned action SHAs and canonical version comments at eligible YAML action paths',
      );
    }
    if (before.references.length !== after.references.length) {
      return deny('workflow updates may not add or remove action references');
    }

    for (let index = 0; index < before.references.length; index += 1) {
      const oldReference = before.references[index];
      const newReference = after.references[index];
      if (
        oldReference.location !== newReference.location ||
        oldReference.name !== newReference.name
      ) {
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
  registryMetadata,
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
      registryMetadata,
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
