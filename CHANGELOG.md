# Changelog

All notable changes to StellarForge CLI will be documented in this file.

The project follows [Semantic Versioning](https://semver.org/) and uses Changesets to capture release intent and generate version/changelog updates.

## 0.2.0

### Minor Changes

- 64f5327: Add `stellarforge validate`: a bounded, local check of the documented local project requirements. Findings carry stable ids (`project.manifest-present`, `project.package-json.parseable`, `project.package-json.scripts-test`, `project.cargo-toml.parseable`, `project.configuration.well-formed`), categories, and required/optional severity. Only required-check failures set the exit code (`5`, the diagnostic-failure category also used by `doctor`); `0` means the documented required requirements are met. Findings never echo configuration values or absolute paths, and every text is bounded like the rest of the CLI.

### Patch Changes

- 35dc2f0: Normalize asynchronous CLI command failures, add actionable template selection guidance and a read-only `new --dry-run` preview, and bound deployment subprocess execution and cleanup while reporting uncertain remote outcomes.
- 1a83ca2: Report unknown commands as `unknown command` with a suggestion and the available command list, map subcommand usage errors (such as unknown options) to the validation exit code `2` with a one-line `--help` hint, and redact secret-like values (Stellar secret keys, seed phrases, tokens, passwords) from supervised subprocess output, including values split across output chunks.
- 3dd52af: Harden project generation against a destination being replaced between
  validation and the write phase (SW-127), bound dev-server child output
  forwarding with backpressure so a noisy child can no longer accumulate an
  unbounded output queue (SW-208), and exclude source maps from the
  published package while adding an opt-in `DEBUG=stellarforge` flag for
  diagnostic stack traces (SW-197).
- 2ad2685: Template generation now refuses to process unexpectedly large template trees: at most 256 regular files, at most 1 MiB of aggregate regular-file content, and at most 256 KiB per file. The budget is measured before any file is read, staged, or promoted, and errors report only safe aggregate values (never local paths or individual file names). Bundled templates remain well within the budget, and all limit boundaries are covered by deterministic tests.
- a45c544: Align the CLI's root identity with the package manifest so `--version`, the root help body, the executable name, and the help description can no longer drift apart: `--version` reports the manifest version, the command name comes from the single `bin` entry (`stellarforge`), and the help description matches the manifest `description`. No duplicated constants remain.
- 5327933: `stellarforge.config.json` is now read and decoded strictly as UTF-8: invalid or truncated byte sequences (including unterminated multi-byte sequences, overlong encodings, and encoded surrogates) are rejected before JSON parsing with the stable `stellarforge.config.json is not valid UTF-8.` error — never with replacement characters. A single leading UTF-8 byte-order mark is tolerated as before-the-fact data; valid non-ASCII text reaches the schema layer unchanged. Double-BOM files are rejected with the stable `stellarforge.config.json is not valid JSON.` message.
- 3398eae: Return the doctor diagnostic exit code when environment checks fail.
- dde43ac: Restore reliable timeout diagnostics, secret redaction, generator type resolution, and cross-platform CLI validation.
- 9f018c5: Treat blank and whitespace-only dev/start/start:backend values as absent in `stellarforge dev` project discovery; whitespace-only candidates are skipped and a fully blank or missing script set yields actionable guidance with no subprocess spawned. Update the dev supervisor's partial-line buffering so bare carriage returns act as line boundaries for progress frames, keeping 64 KiB bounds and secret redaction per line.
- 7f6d5e0: Add deterministic timeout and termination regression coverage (SW-022). The shared process runner now explicitly sets `killSignal: 'SIGTERM'` to ensure consistent cross-platform termination behavior when a diagnostic command exceeds its timeout. New test coverage in `executable-classification.test.ts` verifies that timed-out processes receive the documented termination sequence, processes that ignore SIGTERM are forcefully stopped within the timeout boundary, no child processes remain after test completion on Linux, macOS, and Windows, and the doctor command completes with a stable timeout failure category. Docker diagnostic tests now verify timeout scenarios are classified distinctly from missing executables or daemon unavailability, with appropriate user-facing remediation messages that do not leak raw error codes.
- 13656ba: Add generator text/binary classification fixtures (SW-034). The new `generator-text-binary-classification.test.ts` suite proves that text files permit only the allowlisted `{{projectName}}` and `{{templateId}}` substitutions, binary files (containing at least one NUL byte) are copied byte-for-byte with no token expansion, classification is purely byte-level and deterministic across repeated calls and independent template trees, and mixed templates process text and binary siblings at every nesting depth without cross-contamination.
- 215eb7a: Add `assertPackageMetadata` and `readPackageJson` to `tests/helpers` (SW-039). The new reusable conformance helper centralises all generated-project package.json assertions — name, scripts, engines.node, absence of dependencies, and absence of embedded secrets — so template tests no longer duplicate that boilerplate. Adopted in `basic-app-package-metadata.test.ts`.
- ec022d8: Preserve readable terminal output at narrow widths and in non-TTY mode (SW-126):
  - Add non-lossy terminal wrapping policy for narrow widths and constrained streams.
  - Ensure file paths, URLs, remediation commands, CLI flags, and Stellar StrKeys remain intact and copyable without ambiguous line splits.
  - Enhance terminal text sanitization to neutralize ANSI CSI cursor movements, OSC window titles, DEC cursor controls, and carriage returns.
  - Accurately measure Unicode display widths (wide CJK, emojis, combining marks) and protect multi-byte sequences and surrogate pairs from corruption.
  - Provide deterministic regression tests and fixtures across supported operating systems.
- fe7dc0f: Improve generated-project failure handling and template safety. Missing or non-executable npm launchers now produce runtime-version remediation instead of a generic test failure; template sources reject symlink, filesystem-entry, and Unicode/case-collision hazards before writing; generated POSIX file modes are constrained while executable assets retain execute permission.
- 3798f1a: Restore deploy preflight validation and add a validation-only `--preflight` option. All network, identity, configuration, and project-artifact checks now run before the Stellar CLI process is started; failed checks exit with code `2` and never invoke the subprocess. A successful deployment still invokes the CLI exactly once after validation completes.
- 30387f5: Neutralize Unicode bidirectional formatting controls (bidi overrides and isolates) in untrusted terminal output (SW-209):
  - Extend terminal text sanitization (`sanitizeTerminalText`) to strip Unicode bidi override and isolate control characters (LRE, RLE, PDF, LRO, RLO, LRI, RLI, FSI, PDI).
  - Preserve ordinary multilingual text (Arabic, Hebrew, and other RTL scripts), legitimate combining diacritical marks, ordinary Unicode punctuation, and directional marks (LRM, RLM, ALM).
  - Apply sanitization policy consistently across stdout and stderr streams via `TerminalOutput`.
  - Add deterministic test coverage and fixtures covering deceptive filenames and mixed-direction command output.
- 66b7167: Bound `package.json` reads during dev and test project discovery (SW-214):

  - Enforce a shared, documented maximum manifest size before parsing, so an unexpectedly large `package.json` cannot exhaust memory during project discovery.
  - Read at most one byte beyond the limit and reject oversized manifests with actionable guidance that never echoes file content or absolute paths.
  - Apply the same limit to both `stellarforge dev` and `stellarforge test` resolution, with deterministic boundary and oversized test coverage.

- a494ad9: Require a regular `package.json` file for dev and test project discovery (SW-215):

  - Inspect the manifest entry with `lstatSync` and the opened descriptor with `fstatSync` before reading, so directories, symlinks, dangling symlinks, and other non-regular entries are rejected before their contents are parsed.
  - Keep a missing manifest distinguishable from a present-but-invalid one in both `stellarforge dev` and `stellarforge test`, with error messages that never echo paths, link targets, or file contents.
  - Add deterministic regression coverage for regular files, directory entries, file symlinks, and dangling symlinks where supported.

- 7365217: Close the project-config symlink replacement race during file reads (SW-219):

  - Verify the opened descriptor with `fstatSync` and require the same `(dev, ino)` identity as the `lstatSync`-validated entry before reading any bytes, so a path swapped for a symlink cannot redirect the config read.
  - Open with `O_NOFOLLOW` where the platform exposes it; on unsupported platforms fall back to a read-only open that still fails closed through the descriptor identity check, and document the fallback.
  - Bound the descriptor read to one byte past the 64 KiB limit so files that grow after inspection are rejected, while preserving deterministic missing-file, directory, and symlink behavior.
  - Add deterministic regression coverage using an injected filesystem boundary to simulate replacement before and after open, non-regular descriptors, and post-inspection growth without timing loops.

- dfc2bdd: The `basic-app` template ships an `.env.example` documenting the three public network configuration variables its `src/network.js` reads (`STELLAR_HORIZON_URL`, `STELLAR_RPC_URL`, `STELLAR_NETWORK_PASSPHRASE`), aligned with the other templates. All template `.env.example` files are now verified to contain placeholders only — never credential-like values — and to document exactly the variables the template's code consumes; the test suite enforces this and the git-ignore rules protecting generated `.env` files.
- 2c77722: `stellarforge.config.json` no longer silently accepts documents with duplicate keys (e.g. a repeated `network`, `identity`, or `version`), which could be interpreted ambiguously by different JSON parsers. Duplicate keys at any nesting level, including escaped-equivalent spellings (`\u006Eetwork` vs `network`), are now rejected before schema validation with a stable, bounded message that names the offending key without echoing its value. Documents with other JSON errors keep the existing `stellarforge.config.json is not valid JSON.` message.
- 2285c49: `stellarforge test` no longer accepts a present-but-empty `scripts.test` (including whitespace-only values such as spaces, tabs, newlines, and non-breaking spaces). npm treats an empty test script as a successful no-op, which previously reported success without running any tests. The resolution now raises a validation error before any subprocess is spawned: "This Node.js project defines an empty package.json test script." Valid, non-empty scripts resolve unchanged.
- 78a33ac: Harden the dev supervisor: reconstruct UTF-8 code points split across child output chunks, finalize child output only after stdout and stderr close (so a sensitive assignment split across exit cannot defeat line-based redaction), and handle stdout/stderr stream errors with a stable, sanitized category while terminating sibling processes. The generated API Service template gains a bounded readiness contract: `GET /health` is a local, bounded liveness probe and `GET /ready` reports initialization completion without exposing internal error details.
- a3c42dc: Clarify Stellar CLI diagnostic remediation for unavailable, malformed, and unsupported versions.
- dc0c5ba: Harden parsing and validation of Stellar CLI deployment output into structured contract data. Accept only canonical Stellar Contract IDs in the official supported output format, reject malformed, truncated, or conflicting IDs, ensure non-zero exits fail safely, and redact secret-like text from output and failure messages.
- f17f5dc: Aligns the generated Node template READMEs (`basic-app`, `api-service`, `full-stack`) on diagnosing and recovering from a local port collision (EADDRINUSE): the actual port setting and default per template (none for basic-app, `API_PORT` for api-service, `BACKEND_PORT` for full-stack), guidance platform-neutral for Windows/macOS/Linux with `netstat -ano | findstr`/`taskkill /PID` and `lsof -i`/`kill <pid>` — always the user's own previous instance — and an explicit statement that no template hops ports automatically. Template documentation tests now assert these referenced variables, commands, and forbidden patterns.
- 096253c: Generated projects now carry a small `.stellarforge.json` provenance marker recording only the generator package identifier, the template identifier, and the generator version. The byte format is stable and deterministic apart from the version value; no user, host, path, timestamp, or environment information is recorded, and the marker never collects anything (no network, no executable code).

## 0.1.0 — 2026-09-11

### Added

- Initial public StellarForge CLI MVP foundation and command architecture.
- `stellarforge new` with controlled Basic App, Full Stack, Smart Contract, and API Service templates.
- `stellarforge doctor` diagnostics for Node.js, npm, Git, Rust, Cargo, Stellar CLI, and Docker.
- `stellarforge dev` safe local process orchestration.
- `stellarforge test` unified Node/Cargo test execution.
- `stellarforge deploy` guarded Stellar Testnet smart-contract deployment.
- Versioned `stellarforge.config.json` project configuration with secret-safe validation.
- Cross-platform Linux, macOS, and Windows validation.
- Deterministic linked-CLI end-to-end smoke workflow.
- Changesets-based release management and protected npm/GitHub release automation.
- CodeQL, dependency review configuration, Dependabot, CODEOWNERS, OpenSSF Scorecard, threat modeling, and secure contributor workflows.

### Security

- Uses argument-array subprocess execution with `shell: false`.
- Rejects path traversal, unsafe overwrite targets, raw Stellar StrKeys, secret-like configuration fields, and unsupported deployment networks.
- Keeps signing material in Stellar CLI identity management rather than project configuration.
- Bounds diagnostic subprocess execution time.
- Publishes through npm Trusted Publishing/OIDC once registry bootstrap is completed.

## [Unreleased]

No unreleased user-facing changes yet.
