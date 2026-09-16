# v1.0 Readiness Gate

This document is the stabilization contract for StellarForge CLI after completion of the initial CLI-001 through CLI-038 implementation backlog.

It is intentionally a **gate**, not a feature wishlist. A release candidate does not become v1.0 merely because all planned commands exist. The implemented CLI must demonstrate functional correctness, security, compatibility, documentation completeness, and release integrity.

## Status model

Each item is classified as one of:

- **Automated** — enforced by a repository workflow or test.
- **Manual** — requires an explicit maintainer verification with recorded evidence.
- **Blocked** — implementation exists, but an external administrative prerequisite is incomplete.

A v1.0 release requires all required Automated and Manual items to pass and no required item to remain Blocked.

## 1. Functional gate

| Requirement | Verification | Type |
| --- | --- | --- |
| Installed/built executable exposes help and version | E2E Smoke | Automated |
| `stellarforge new` generates a supported project | unit/template tests + E2E Smoke | Automated |
| Basic App template generates and tests | CI + E2E Smoke | Automated |
| Full Stack template generates and tests | CI template tests | Automated |
| Smart Contract template generates | CI + E2E Smoke | Automated |
| API Service template generates and tests | CI template tests | Automated |
| `stellarforge doctor` reports bounded diagnostics and stable exit semantics | CI + E2E Smoke | Automated |
| `stellarforge dev` uses safe supervised subprocesses | CI supervisor/command tests | Automated |
| `stellarforge test` supports Node and Cargo project workflows | CI command tests | Automated |
| `stellarforge deploy` remains Testnet-only and rejects raw signing material | CI deploy tests + E2E mocked deploy | Automated |
| Quick Start succeeds from a clean supported workstation | maintainer release-candidate walkthrough | Manual |

## 2. Security gate

| Requirement | Verification | Type |
| --- | --- | --- |
| Static analysis passes | CodeQL workflow | Automated |
| New dependency risk is reviewed | Dependency Review workflow | Automated |
| GitHub Actions are pinned to immutable commit SHAs | workflow review / dependency automation | Automated + review |
| Filesystem generation rejects traversal, unsafe destinations, and unsafe symlink behavior | generator security tests | Automated |
| Subprocesses avoid constructed shell interpolation | process/command tests and code review | Automated + review |
| Project configuration rejects secret-bearing fields/raw StrKeys and does not execute code | configuration tests | Automated |
| Logs/errors do not intentionally echo secret values | configuration/deploy/E2E tests | Automated |
| npm publishing uses OIDC/Trusted Publishing rather than a long-lived npm token | release workflow + npm publisher configuration | Blocked on REL-001 |
| Security reporting path is documented | `SECURITY.md` | Manual review |

Any unresolved security vulnerability affecting the release candidate blocks v1.0 regardless of checklist status.

## 3. Compatibility gate

Supported runtime contract:

- Node.js: `>=22.13.0 <25`
- npm: `>=10.9.0`
- supported Node majors: 22 and 24
- operating systems exercised by CI: Linux, macOS, Windows

| Requirement | Verification | Type |
| --- | --- | --- |
| Linux / Node 22.13 | CI matrix | Automated |
| Linux / Node 24 | CI matrix | Automated |
| macOS / Node 22.13 | CI matrix | Automated |
| Windows / Node 22.13 | CI matrix | Automated |
| package engine range matches documented support | package metadata + documentation review | Manual |
| Stellar CLI invocation still matches the supported upstream CLI contract | release-candidate compatibility review | Manual |

A change in the upstream Stellar CLI that breaks the documented deploy/diagnostic contract must be resolved before v1.0.

## 4. Documentation gate

The following must describe **implemented behavior**, not roadmap intent:

- Installation
- Quick Start
- Command Reference
- Configuration Reference
- Platform Support
- Troubleshooting
- Exit Codes
- Security Policy
- Contribution workflow
- Release process

Required checks:

- no documentation may claim the package is private after publication readiness has removed that guard;
- examples must use the supported command names/options;
- Testnet-only deployment boundaries must remain explicit;
- no documentation may instruct users to place raw secrets in project configuration;
- the Quick Start must be executed manually once per release candidate from a clean supported environment.

Documentation drift discovered during stabilization should be fixed in a scoped documentation issue rather than hidden inside unrelated feature work.

## 5. Release gate

Before each v0.7–v0.9 release candidate and v1.0:

1. CI is green.
2. E2E Smoke is green.
3. CodeQL is green.
4. Dependency Review is green.
5. `npm run release:dry-run` succeeds.
6. Changesets status is understood and intentional.
7. packed package contents are inspected.
8. no unresolved P0/P1 release blocker remains.
9. npm package version, Git tag, GitHub Release, and provenance agree for an actual publication.
10. the protected `npm-release` environment and Trusted Publisher are active before publication.

The actual npm publication portion remains blocked until REL-001 is completed.

## 6. Performance and usability targets

These are release-candidate verification targets rather than hard guarantees across every machine:

- project scaffolding should complete in under 30 seconds excluding dependency/network delays;
- diagnostics must not hang indefinitely on external tools;
- common validation failures should identify the invalid input category and remediation without leaking sensitive values;
- normal command help should remain discoverable without external documentation.

Performance regressions found during release-candidate testing should become separately scoped issues with reproducible measurements.

## 7. v0.7–v0.9 stabilization policy

The stabilization releases are reserved for:

- compatibility fixes;
- integration defects;
- security remediation;
- documentation corrections;
- usability/error-message improvements;
- measured performance work;
- release-process corrections.

They must not be filled with artificial features to advance version numbers.

A breaking behavior discovered during stabilization may be corrected before v1.0 when documented and tested. Once v1.0 is released, normal Semantic Versioning compatibility expectations apply.

## 8. Explicitly out of scope for v1.0

The following remain post-v1 candidates unless a new architecture/product decision changes scope:

- plugin architecture;
- `stellarforge add`;
- remote template registry;
- project upgrade engine;
- Mainnet deployment automation;
- hosted deployment platform;
- blockchain indexing;
- smart-contract auditing;
- AI-assisted scaffolding;
- workspace/monorepo management;
- domain-specific payment, identity, marketplace, DAO, RWA, or enterprise templates.

## 9. Current blockers and follow-up policy

### External blocker

- **REL-001** — npm namespace bootstrap, npm Trusted Publisher, protected GitHub `npm-release` environment, publication variable, and first protected OIDC publication.

### Gap handling

When this reconciliation finds a gap:

1. open a separate scoped issue;
2. classify whether it blocks v1.0;
3. implement it through the normal branch/PR/security gates;
4. update this document only when the readiness contract itself changes.

Do not expand CLI-039 into implementation work for unrelated gaps.

## 10. v1.0 release decision

v1.0 is ready only when:

- the PRD Definition of Done is demonstrably satisfied;
- every required automated gate is green;
- every required manual verification has recorded evidence;
- REL-001 and any other required external blocker are complete;
- there are no unresolved P0/P1 blockers;
- the release candidate has passed the documented protected release process.

Maintainers should record the final readiness review in the v1.0 release PR or its linked tracking issue.
