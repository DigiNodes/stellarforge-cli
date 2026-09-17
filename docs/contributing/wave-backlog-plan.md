# StellarForge CLI — Stellar Wave Backlog Plan

**Backlog target:** 120 contributor issues

This plan defines the dependency graph and contributor taxonomy before GitHub issue creation. It is designed to maximize parallel contribution while preserving the frozen architecture in `docs/contributing/wave-architecture.md`.

## Taxonomy

### Points / difficulty

- **100 points — Low:** tightly scoped docs/tests/UX/template-local work; usually one surface and no architecture change.
- **150 points — Medium:** multi-file implementation or non-trivial tests inside an established boundary.
- **200 points — High:** security-sensitive/core integration, cross-platform/process/filesystem work, or work requiring deeper repository knowledge.

### Priority

- **P0:** release/security blocker or prerequisite for a major dependency chain.
- **P1:** important stabilization/correctness work.
- **P2:** meaningful enhancement/quality work that is not release-blocking by default.
- **P3:** optional polish/research/future-readiness work.

### Workstreams

- `WS-CORE` — command/core behavior
- `WS-GEN` — generator safety and orchestration
- `WS-TPL` — bundled starter templates
- `WS-DIAG` — doctor/diagnostics
- `WS-DEV` — development orchestration
- `WS-TEST` — test orchestration and test infrastructure
- `WS-DEPLOY` — Testnet deployment
- `WS-CONFIG` — project configuration
- `WS-UX` — terminal output/error/help usability
- `WS-SEC` — security/trust-boundary hardening
- `WS-CI` — CI/platform/repository automation
- `WS-REL` — package/release engineering
- `WS-DOCS` — public/contributor documentation
- `WS-PERF` — measured performance/reliability

### Required GitHub issue labels

Every Wave issue body ends with a `# 🏷 Labels` section using list items. The issue itself should receive the equivalent repository labels where they exist.

Required semantic labels:

- `Stellar Wave`
- one `type: ...`
- one `area: ...`
- one `priority: P0|P1|P2|P3`
- one `difficulty: low|medium|high`
- one `points: 100|150|200`
- one `workstream: ...`

Optional labels include `good first issue`, `help wanted`, `security-sensitive`, `stellar`, `dependencies`, `supply-chain`, `release`, `blocked`, and `protected-surface`.

## Dependency graph

Issue IDs below are the contributor-backlog IDs that will be used in GitHub titles.

### Foundation / dependency-free layer

These are designed to be independently assignable from current `main`.

- **SW-001** Doctor output snapshot tests
- **SW-002** Node/npm diagnostic malformed-version fixtures
- **SW-003** Git diagnostic edge-case fixtures
- **SW-004** Rust/Cargo diagnostic malformed-output fixtures
- **SW-005** Stellar CLI diagnostic version-format fixtures
- **SW-006** Docker diagnostic daemon-error classification fixtures
- **SW-007** Exit-code reference conformance tests
- **SW-008** Help-output command inventory conformance test
- **SW-009** Config unknown-field error tests
- **SW-010** Config file size-boundary tests
- **SW-011** Generator project-name Unicode/whitespace rejection tests
- **SW-012** Generator Windows reserved-name regression matrix
- **SW-013** Generator destination collision regression tests
- **SW-014** Template registry metadata completeness tests
- **SW-015** Basic App generated README accuracy audit/fix
- **SW-016** API Service generated README accuracy audit/fix
- **SW-017** Smart Contract generated README accuracy audit/fix
- **SW-018** Full Stack generated README accuracy audit/fix
- **SW-019** Troubleshooting index/cross-link cleanup
- **SW-020** Platform support documentation verification

### Diagnostics chain

- **SW-021** Shared diagnostic executable-not-found classification — depends SW-002..006
- **SW-022** Shared diagnostic timeout result classification — depends SW-021
- **SW-023** Diagnostic stderr redaction regression suite — depends SW-021
- **SW-024** Node/npm remediation consistency — depends SW-002, SW-021
- **SW-025** Rust/Cargo remediation consistency — depends SW-004, SW-021
- **SW-026** Stellar CLI remediation consistency — depends SW-005, SW-021
- **SW-027** Docker remediation consistency — depends SW-006, SW-021
- **SW-028** Doctor deterministic result ordering — depends SW-001
- **SW-029** Doctor summary pluralization/grammar tests — depends SW-001
- **SW-030** Doctor bounded-output regression tests — depends SW-023, SW-028

### Generator safety / orchestration chain

- **SW-031** Generator destination realpath containment tests — depends SW-011..013
- **SW-032** Generator symlink ancestor regression tests — depends SW-031
- **SW-033** Generator partial-failure cleanup tests — depends SW-031
- **SW-034** Generator text/binary classification fixtures — depends SW-014
- **SW-035** Generator substitution allowlist negative tests — depends SW-014
- **SW-036** Generator deterministic file-order tests — depends SW-034
- **SW-037** Empty existing destination behavior tests — depends SW-013
- **SW-038** Generator error-message consistency — depends SW-031, SW-035
- **SW-039** Generated-project metadata conformance helper — depends SW-014
- **SW-040** Generator security regression umbrella suite — depends SW-032, SW-033, SW-035

### Template quality chain

- **SW-041** Basic App package metadata conformance — depends SW-015, SW-039
- **SW-042** Basic App clean install/test smoke — depends SW-041
- **SW-043** API Service package metadata conformance — depends SW-016, SW-039
- **SW-044** API Service health-route failure tests — depends SW-043
- **SW-045** API Service Stellar config validation examples — depends SW-043
- **SW-046** Smart Contract Cargo metadata conformance — depends SW-017, SW-039
- **SW-047** Smart Contract contract-test fixture expansion — depends SW-046
- **SW-048** Smart Contract Testnet workflow documentation test — depends SW-046
- **SW-049** Full Stack workspace metadata conformance — depends SW-018, SW-039
- **SW-050** Full Stack frontend/backend startup smoke — depends SW-049
- **SW-051** Full Stack environment-example validation — depends SW-049
- **SW-052** Cross-template secret-pattern scan test — depends SW-041, SW-043, SW-046, SW-049
- **SW-053** Cross-template README command conformance — depends SW-041, SW-043, SW-046, SW-049
- **SW-054** Cross-template generated-name substitution tests — depends SW-041, SW-043, SW-046, SW-049
- **SW-055** Cross-template package-file allowlist test — depends SW-052

### Dev/process chain

- **SW-056** Dev unsupported-project error tests
- **SW-057** Dev child startup-order tests
- **SW-058** Dev prefixed partial-line buffering tests
- **SW-059** Dev stderr prefix regression tests
- **SW-060** Dev child non-zero sibling-cleanup tests — depends SW-057
- **SW-061** Dev SIGINT repeated-signal idempotency — depends SW-057
- **SW-062** Dev SIGTERM repeated-signal idempotency — depends SW-057
- **SW-063** Dev environment allowlist regression suite
- **SW-064** Windows npm invocation metacharacter tests — depends SW-063
- **SW-065** Dev supervisor cleanup umbrella tests — depends SW-060..062

### Test orchestration chain

- **SW-066** Test unsupported-project detection fixtures
- **SW-067** Test npm workflow exit-code propagation
- **SW-068** Test Cargo workflow exit-code propagation
- **SW-069** Test stdout/stderr streaming assertions — depends SW-067, SW-068
- **SW-070** Test Windows npm wrapper regression — depends SW-067
- **SW-071** Test project-marker ambiguity rejection — depends SW-066
- **SW-072** Generated Basic App via `stellarforge test` integration — depends SW-042, SW-067
- **SW-073** Generated API Service via `stellarforge test` integration — depends SW-044, SW-067
- **SW-074** Generated Smart Contract test-plan integration — depends SW-047, SW-068
- **SW-075** Unified test orchestration regression suite — depends SW-069..074

### Configuration chain

- **SW-076** Config malformed-JSON position-independent errors — depends SW-009
- **SW-077** Config symlink/non-file regression matrix — depends SW-010
- **SW-078** Config identity alias boundary tests — depends SW-009
- **SW-079** Config network enum conformance tests — depends SW-009
- **SW-080** Config CLI-over-file precedence integration tests — depends SW-078, SW-079
- **SW-081** Config secret-field naming variants — depends SW-009
- **SW-082** Config secret-value non-reflection umbrella tests — depends SW-076, SW-081
- **SW-083** Config reference examples verification — depends SW-080

### Testnet deployment chain

- **SW-084** Deploy missing-config remediation tests — depends SW-080
- **SW-085** Deploy Mainnet/futurenet/local rejection matrix — depends SW-079
- **SW-086** Deploy raw StrKey rejection matrix — depends SW-078
- **SW-087** Deploy seed-phrase/path/metacharacter rejection — depends SW-086
- **SW-088** Deploy exact Stellar argument-order tests — depends SW-084
- **SW-089** Deploy subprocess non-zero propagation — depends SW-088
- **SW-090** Deploy stdout/stderr secret non-reflection — depends SW-082, SW-089
- **SW-091** Deploy mocked contract-ID output handling — depends SW-088
- **SW-092** Deploy Testnet E2E fixture expansion — depends SW-087, SW-090, SW-091
- **SW-093** Deployment security regression umbrella suite — depends SW-085..092

### CLI UX / docs chain

- **SW-094** Unknown-command remediation copy tests — depends SW-008
- **SW-095** Unknown-option remediation copy tests — depends SW-008
- **SW-096** Error category wording consistency — depends SW-007
- **SW-097** Non-TTY output readability audit/fix — depends SW-096
- **SW-098** Command examples executable-doc test harness — depends SW-019
- **SW-099** Quick Start command verification — depends SW-098
- **SW-100** Installation source-checkout verification — depends SW-098
- **SW-101** Configuration docs executable examples — depends SW-083, SW-098
- **SW-102** Troubleshooting remediation cross-check — depends SW-024..027, SW-098
- **SW-103** Testnet deployment docs conformance — depends SW-092, SW-098

### CI / security / release chain

- **SW-104** Workflow SHA-pin conformance test
- **SW-105** Workflow permissions conformance audit/test
- **SW-106** Prohibit `pull_request_target` regression check — depends SW-105
- **SW-107** CODEOWNERS protected-surface coverage audit — depends contributor architecture freeze
- **SW-108** Changeset-required contributor examples
- **SW-109** Package `files` allowlist regression test
- **SW-110** npm pack content snapshot test — depends SW-109
- **SW-111** Release dry-run artifact assertions — depends SW-110
- **SW-112** Release workflow permission regression tests — depends SW-105, SW-111
- **SW-113** Trusted Publishing documentation conformance — depends REL-001 state, SW-112
- **SW-114** Dependency Review policy documentation/test alignment
- **SW-115** Dependabot grouping policy documentation/test alignment

### Performance / final integration chain

- **SW-116** Generator local performance benchmark harness — depends SW-042, SW-043, SW-046, SW-049
- **SW-117** Doctor runtime benchmark with fake executables — depends SW-030
- **SW-118** E2E smoke assertion hardening — depends SW-075, SW-092, SW-099
- **SW-119** Cross-platform critical-path regression suite — depends SW-064, SW-075, SW-093, SW-118
- **SW-120** Wave backlog conformance/final conflict audit — depends all created issue metadata; maintainer-owned

## Conflict policy

The dependency graph intentionally sequences high-conflict files:

- `src/generator/template-generation.ts`: SW-031..040 are sequenced through shared prerequisites.
- `src/dev/orchestrator.ts`: SW-057 → SW-060..062 → SW-065.
- `src/config/**`: SW-076..083 share explicit prerequisite chains.
- `src/deployment/**` / `src/commands/deploy.ts`: SW-084..093 are sequenced.
- `.github/workflows/**`: SW-104..115 use conformance-first prerequisites and protected-surface review.
- cross-template work waits for template-local conformance issues.

Parallel issues should primarily own separate test files/docs/template-local files. If two assigned issues need the same production core file, the later dependency should wait unless maintainers explicitly approve parallelization.

## First contributor batch candidates

The intended first batch is 16 dependency-free, low-conflict issues:

- SW-001, SW-002, SW-003, SW-004, SW-005, SW-006
- SW-007, SW-008, SW-009, SW-010
- SW-011, SW-012, SW-013, SW-014
- SW-019, SW-020

Template README audits SW-015..018 are also dependency-free but should be held as reserve issues if the first batch fills quickly.
