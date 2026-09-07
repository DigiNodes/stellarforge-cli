# StellarForge CLI Architecture Overview

## Purpose

StellarForge CLI is the developer-facing orchestration layer of the StellarForge ecosystem. It should make common Stellar application setup, diagnostics, development, testing, and Testnet deployment workflows predictable without absorbing responsibilities that belong in SDK, workflow, indexing, or security-specific modules.

## Architectural Shape

```text
User
  │
  ▼
CLI Entry Point
  │
  ▼
Root Command / Command Registry
  │
  ├── new
  ├── doctor
  ├── dev
  ├── test
  └── deploy
  │
  ▼
Command Services
  │
  ├── configuration validation
  ├── filesystem/project generation
  ├── process orchestration
  ├── template handling
  ├── diagnostics
  └── network/deployment adapters
  │
  ▼
External Tools / Stellar Network / Generated Projects
```

## Core Principles

1. **Thin commands** — parse input, validate, coordinate, return output.
2. **Explicit boundaries** — filesystem, process, network, config, and template behavior live behind focused modules.
3. **Testability** — command behavior should be testable without requiring a live network or mutating a developer machine.
4. **Security by default** — paths, config, environment values, process input/output, network responses, and templates are untrusted until validated.
5. **Deterministic behavior** — exit codes, output routing, file generation, and failure handling must be predictable.
6. **Minimal dependency surface** — new dependencies require clear value and supply-chain consideration.
7. **Composable modules** — future commands should be added without turning bootstrap files into monoliths.

## Repository Responsibilities

This repository owns:

- command-line parsing and invocation;
- project scaffolding orchestration;
- supported template selection/generation;
- environment diagnostics;
- local development/test orchestration;
- Stellar Testnet deployment orchestration;
- CLI configuration and terminal UX;
- CLI-specific tests, docs, and release engineering.

This repository does **not** own:

- generalized Stellar SDK functionality;
- workflow-engine internals;
- indexer implementation;
- smart-contract audit engines;
- hosted deployment infrastructure;
- plugin marketplace or remote-template registry in v1.

## MVP Boundaries

The v1.0 MVP targets `new`, `doctor`, `dev`, `test`, and Testnet `deploy`, plus global help/version behavior. `stellarforge add`, plugins, remote templates, Mainnet deployment automation, and domain-specific Payment/Identity/Enterprise templates are post-v1.

## Related Decisions

- ADR-0001 — Project Architecture
- ADR-0003 — Release and Versioning Strategy
- ADR-0004 — Security Baseline
- Threat Model — `docs/architecture/threat-model.md`
- Trust Boundaries — `docs/architecture/trust-boundaries.md`
