# Platform Support

StellarForge CLI treats supported-platform failures as release blockers unless a limitation is explicitly documented and reviewed.

## Supported MVP matrix

| Operating system | Runtime | Validation level |
| --- | --- | --- |
| Linux (GitHub-hosted Ubuntu) | Node.js 22.13+ LTS | Full quality gate, tests, build, generated-project smoke |
| Linux (GitHub-hosted Ubuntu) | Node.js 24 LTS | Tests, build, generated-project smoke |
| macOS (GitHub-hosted macOS) | Node.js 22.13+ LTS | Tests, build, generated-project smoke |
| Windows (GitHub-hosted Windows) | Node.js 22.13+ LTS | Tests, build, generated-project smoke |

The package engine range remains `Node.js >=22.13.0 <25` and `npm >=10.9.0`, matching `package.json`. Node.js 22 and Node.js 24 are the supported LTS majors for the current MVP. Intermediate non-LTS Node releases are not release-validation targets. These documented ranges mirror the CI matrix and must not be expanded or contracted without a policy review.

## What the platform matrix exercises

The platform jobs run the repository test suite, the production build, and clean generated-project smoke passes for all four templates on every OS leg: each Node template (`basic-app`, `api-service`, `full-stack`) is generated from the built CLI, installed with `npm install --ignore-scripts`, and run through its documented `npm run check` and `npm test` commands. The `smart-contract` template is generated and validated with an offline `cargo metadata --no-deps` invocation in a dedicated Cargo job (no crate resolution from crates.io). This includes coverage for:

- compiled CLI startup, help, version, and parser exit behavior;
- project path validation and generation safety;
- generated Basic App, Full Stack, Smart Contract, and API Service smoke checks;
- platform-specific executable selection such as the Windows npm wrapper, `cargo.exe`, and `stellar.exe`;
- subprocess supervision and failure propagation;
- project test/development workflow resolution;
- project configuration loading and security validation.

The Linux quality job additionally runs type checking, linting, and Prettier validation.

## Platform differences

StellarForge code should expose platform differences deliberately instead of hiding them behind shell behavior.

### Windows

- npm subprocesses use a fixed `cmd.exe /d /s /c npm ...` wrapper because Windows `.cmd` shims are not directly executable under the CLI's `shell: false` policy;
- Cargo subprocesses use `cargo.exe`;
- Stellar deployment subprocesses use `stellar.exe`;
- path tests must use Node path APIs rather than assuming POSIX separators;
- commands must not rely on Bash being the default shell;
- POSIX permission and ownership bits reported for files are synthetic, so config loading ignores them on every platform instead of applying platform-dependent rules or changing file permissions.

### macOS and Linux

- npm, Cargo, and Stellar executables use their ordinary executable names;
- generated projects and CLI subprocesses still use argument arrays rather than shell command concatenation.

## Terminal and Non-TTY Output Handling

StellarForge CLI enforces deterministic, readable terminal output across interactive terminals, redirected pipes, and non-TTY CI environments:

- **Non-lossy wrapping policy:** When a terminal width (`columns`) is detected or explicitly configured, diagnostic messages and reports wrap at word boundaries without loss of textual content.
- **Copyable paths and commands:** Long filesystem paths (both POSIX and Windows), URLs, backticked or quoted remediation commands, CLI flags, and Stellar cryptographic identifiers (StrKeys and Contract IDs) are treated as atomic unbreakable units. They remain copyable without ambiguous line splits or inserted breaks.
- **Unicode display width awareness:** Grapheme-aware width calculation measures East Asian Wide (CJK) characters as 2 columns, emojis as 2 columns, and zero-width combining marks as 0 columns. Multi-byte sequences, surrogate pairs, and combining marks are never split or corrupted across lines.
- **Non-TTY and redirected streams:** Streams with undefined width (such as non-TTY file redirections and CI stdout/stderr) do not introduce arbitrary column wrapping. ANSI escape sequences, OSC window-title commands, DEC cursor controls, and carriage returns are stripped to ensure deterministic snapshots that never depend on terminal color or cursor manipulation.

## External tools

A green platform job validates StellarForge's code and tests on that OS; it does not guarantee every optional external tool is preinstalled on every runner.

`stellarforge doctor` is responsible for reporting the actual local availability of Git, Rust, Cargo, Stellar CLI, Docker, and supported runtimes. Tests accept either a healthy or diagnostic-failure result where runner tool availability is intentionally variable.

## Release policy

A failing Linux, macOS, or Windows matrix job blocks merge/release for changes that affect the supported CLI surface. A failure may be waived only through an explicit project decision that documents the affected platform, reason, user impact, and follow-up plan.

Platform-specific failures must not be hidden with `continue-on-error` in the supported matrix.

## Troubleshooting

For installation and setup failures, see [Troubleshooting](troubleshooting.md#installation-or-setup-fails). Runtime and tool requirements are in [Installation](../guides/installation.md#contributor-prerequisites), and exit codes are defined in [Exit Codes](exit-codes.md).
