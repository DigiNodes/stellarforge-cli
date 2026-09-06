# Product Requirements Document (PRD) — StellarForge CLI

**Project:** StellarForge  
**Component:** `stellarforge-cli`  
**Version:** v1.0 MVP  
**Status:** Draft  
**Owner:** StellarForge Core Team

## 1. Overview

StellarForge CLI is the official command-line interface for the StellarForge ecosystem. It is designed to simplify the process of creating, developing, testing, diagnosing, and deploying applications built on Stellar.

The CLI is intended to be the primary developer entry point into StellarForge. Its job is to provide a consistent, secure, and reusable developer experience while delegating specialized concerns such as SDK behavior, workflow orchestration, indexing, and security analysis to their respective StellarForge modules.

## 2. Problem

Developers building on Stellar repeatedly perform the same setup work before product development can begin. Common tasks include:

- creating project structures;
- configuring TypeScript/Node.js tooling;
- wiring Stellar SDK dependencies;
- configuring Stellar development tooling;
- managing environment variables and network settings;
- setting up local development workflows;
- creating test infrastructure;
- writing deployment scripts;
- configuring Docker and CI/CD where required;
- validating local development dependencies.

This repetition leads to inconsistent architectures, slower onboarding, duplicated boilerplate, configuration mistakes, and maintenance overhead.

## 3. Product Goal

StellarForge CLI should enable a developer to start from an empty directory and reach a structured Stellar application foundation with minimal manual setup.

The v1.0 MVP should provide:

1. project scaffolding;
2. controlled starter templates;
3. environment diagnostics;
4. local development orchestration;
5. unified test orchestration;
6. Stellar Testnet deployment support;
7. clear documentation and failure guidance.

## 4. Non-Goals for v1.0

The following are explicitly outside the MVP:

- GUI dashboard;
- smart-contract auditing;
- blockchain indexing;
- AI code generation;
- production monitoring;
- hosted deployment platform;
- wallet marketplace;
- plugin marketplace;
- generic plugin architecture;
- remote template registry;
- `stellarforge add` feature installation;
- Mainnet deployment automation;
- payment, identity, marketplace, DAO, RWA, or enterprise-specific domain templates.

These may be evaluated after the core CLI is stable.

## 5. Target Users

### Primary

- Stellar and smart-contract developers;
- Web3 backend developers;
- full-stack developers building Stellar-enabled applications;
- open-source contributors working within the Stellar ecosystem.

### Secondary

- hackathon teams;
- developer bootcamps;
- startups prototyping on Stellar;
- engineering teams evaluating Stellar infrastructure.

## 6. Success Criteria

The following are product targets, not current claims:

- a developer can install the CLI with minimal setup friction;
- a supported project can be scaffolded in under 30 seconds on a typical development machine, excluding dependency/network delays;
- local development can be started through one CLI command where the selected template supports it;
- common environment problems are detected by `stellarforge doctor` with actionable remediation guidance;
- a sample smart contract can be deployed to Stellar Testnet with minimal configuration;
- the documented Quick Start can be completed without undocumented maintainer intervention.

## 7. Core Features

### 7.1 `stellarforge new`

Creates a new project from a controlled StellarForge template.

Example:

```bash
stellarforge new my-app
```

The command should:

- validate the project name;
- validate the destination path;
- prevent unsafe overwrites;
- allow selection of a supported template;
- generate the required project files;
- apply template variables safely;
- optionally install dependencies when supported;
- optionally initialize Git when appropriate;
- provide clear success/failure output;
- leave the filesystem in a predictable state if generation fails.

### 7.2 Initial Starter Templates

The MVP supports four template categories:

1. Basic App
2. Full Stack App
3. Stellar Smart Contract
4. API Service

Templates must be versioned with the CLI or otherwise controlled by the trusted release process for the MVP.

### 7.3 `stellarforge dev`

Starts the supported local development workflow for a generated project.

The command should:

- validate project configuration;
- validate required local tools;
- start required local processes/services;
- handle process lifecycle and signals correctly;
- surface useful logs;
- clean up child processes when the command exits.

The CLI should orchestrate supported tools rather than re-implementing them.

### 7.4 `stellarforge test`

Runs the appropriate project test workflow.

The command should:

- detect or read the supported test configuration;
- invoke the correct test commands safely;
- preserve meaningful failure exit codes;
- avoid hiding underlying test failures;
- support unit, contract, and integration workflows where relevant to the selected template.

### 7.5 `stellarforge deploy`

Provides guarded deployment orchestration for Stellar Testnet.

The MVP should:

- validate the selected network;
- validate required deployment configuration;
- validate required Stellar tooling;
- invoke external tooling safely;
- avoid leaking credentials or sensitive environment values;
- provide clear deployment results and actionable failure messages.

Mainnet deployment is not part of v1.0.

### 7.6 `stellarforge doctor`

Validates the local development environment.

Checks may include, where required by the selected workflow:

- Node.js;
- npm;
- Git;
- Rust;
- Cargo;
- current Stellar CLI tooling;
- Docker;
- Stellar/network configuration.

Diagnostics should report:

- whether a requirement is satisfied;
- detected version where safe;
- expected version/range where defined;
- remediation guidance;
- non-zero exit behavior when required checks fail.

## 8. Command Surface

The v1.0 command surface is intentionally small:

| Command | Purpose |
| --- | --- |
| `stellarforge new` | Create a new Stellar project |
| `stellarforge dev` | Start supported local development workflows |
| `stellarforge test` | Run supported project tests |
| `stellarforge deploy` | Deploy supported components to Stellar Testnet |
| `stellarforge doctor` | Validate the development environment |
| `stellarforge --version` | Display CLI version |
| `stellarforge --help` | Display usage/help |

## 9. Generated Project Expectations

A generated project may include, depending on template:

- frontend application;
- backend service;
- smart contracts;
- Stellar configuration;
- environment examples;
- test setup;
- Docker configuration where required;
- GitHub Actions where appropriate;
- project documentation.

Not every template must include every component.

## 10. Technical Direction

Initial implementation direction:

- TypeScript;
- Node.js;
- npm;
- a bundling/build tool selected and documented by implementation decision;
- Vitest for testing unless changed through a documented decision;
- ESLint;
- Prettier;
- GitHub Actions.

Architecture choices with long-term impact should be recorded in ADRs.

## 11. Repository Ownership

`stellarforge-cli` owns:

- CLI parsing and command coordination;
- project scaffolding;
- template management for CLI-supported templates;
- local development orchestration;
- diagnostics;
- test/deployment orchestration;
- terminal output and CLI error behavior.

It does not own:

- reusable Stellar SDK implementation;
- workflow/event-engine implementation;
- indexer implementation;
- smart-contract security analysis;
- ecosystem-wide governance.

Those concerns belong in their respective StellarForge repositories/modules.

## 12. Security Requirements

Because the CLI operates on developer machines and CI systems, security requirements are part of the product definition.

The implementation must:

- treat command arguments, paths, configuration, environment values, process output, network responses, dependencies, and templates as untrusted until validated;
- prevent path traversal and unintended writes;
- avoid shell interpolation of untrusted input;
- avoid logging secrets;
- use least-privilege CI/release permissions;
- maintain dependency and lockfile controls;
- test security-sensitive behavior;
- follow the repository threat model and security baseline ADR.

## 13. Risks

Key risks include:

- inconsistent cross-platform behavior;
- changing Stellar development tooling;
- template compatibility drift;
- dependency conflicts;
- unsafe filesystem/process behavior;
- release and supply-chain compromise;
- scope expansion before the core CLI is stable.

Mitigations include automated tests, semantic versioning, controlled templates, CI/security checks, dependency review, explicit architecture boundaries, and staged releases.

## 14. Future Candidates

Post-v1 candidates may include:

- plugin architecture;
- `stellarforge add` package/module installation;
- interactive advanced generators;
- remote template registry;
- project upgrade tooling;
- advanced release automation;
- workspaces/monorepo assistance;
- AI-assisted scaffolding;
- additional deployment workflows.

These are not commitments until accepted through roadmap/architecture decisions.

## 15. Definition of Done for v1.0

The MVP is considered complete when a supported user can:

1. install the CLI;
2. create a supported project;
3. start its supported local development workflow;
4. run supported tests;
5. diagnose common environment problems;
6. deploy the supported sample workflow to Stellar Testnet;
7. follow the Quick Start without undocumented maintainer intervention;
8. do all of the above under the project's defined security, CI, documentation, and release requirements.
