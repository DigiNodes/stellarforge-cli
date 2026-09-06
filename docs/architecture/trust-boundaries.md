# StellarForge CLI Trust Boundaries

This document makes the CLI's major trust boundaries explicit so implementation issues and reviews can identify where validation is required.

## Boundary 1 — User Input → CLI

Includes command arguments, flags, prompts, project names, paths, network choices, and configuration references.

**Rule:** Parse and validate before using input in filesystem, process, network, or deployment operations.

## Boundary 2 — Filesystem → CLI

Includes existing project files, configuration, symlinks, directories, templates, and generated destinations.

**Rule:** Do not assume a path is safe because it came from the local filesystem. Resolve containment, define overwrite behavior, and account for symlinks and collisions.

## Boundary 3 — Environment → CLI

Includes environment variables, PATH resolution, CI variables, and credentials used by external tooling.

**Rule:** Read only what is needed, validate non-secret configuration, minimize secret exposure, and never echo sensitive values.

## Boundary 4 — CLI → External Processes

Includes Git, Node/npm, Rust/Cargo, Stellar CLI, Docker, test runners, and future deployment tooling.

**Rule:** Use safe argument passing, avoid shell interpolation, constrain executable selection where practical, propagate meaningful exit behavior, and clean up child processes.

## Boundary 5 — External Process Output → CLI

External tools may emit unexpected, malformed, very large, or sensitive output.

**Rule:** Treat output as untrusted data. Parse defensively and avoid blindly reflecting potentially sensitive content.

## Boundary 6 — Network/RPC → CLI

Includes Stellar RPC and other approved network services.

**Rule:** Validate expected response structures and network identity where relevant. Handle timeouts/failures without unsafe fallback behavior.

## Boundary 7 — Templates → Generated Project

MVP templates are controlled project assets, but template parameters remain untrusted.

**Rule:** Validate substitutions, destination paths, filenames, and generated configuration. Remote arbitrary templates are not an MVP capability.

## Boundary 8 — Dependency Ecosystem → CLI

npm packages and GitHub Actions execute or influence code in trusted developer/release contexts.

**Rule:** Minimize dependencies, lock versions, review additions/updates, scan for known vulnerabilities, and restrict workflow permissions.

## Boundary 9 — Pull Requests → CI

Contributor code is untrusted until reviewed and merged.

**Rule:** PR CI must not expose release credentials or elevated tokens to contributor-controlled code. Privileged release operations run only from trusted refs/workflows.

## Boundary 10 — CLI → Stellar Deployment

Deployment crosses from local tooling into externally observable blockchain state.

**Rule:** Validate target network/configuration and make consequential actions explicit. MVP deployment targets Stellar Testnet; expanding to Mainnet requires additional design/security review.
