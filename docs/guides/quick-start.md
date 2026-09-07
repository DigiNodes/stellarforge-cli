# Quick Start

This guide describes the intended MVP workflow. Commands may remain unavailable until their implementation issues are merged.

## Create a Project

```bash
stellarforge new my-app
```

Select one supported MVP template: Basic App, Full Stack App, Stellar smart contract, or API Service.

## Validate Your Environment

```bash
stellarforge doctor
```

Diagnostics should identify missing or incompatible developer tools and provide remediation guidance without exposing sensitive environment values.

## Develop

```bash
stellarforge dev
```

The CLI will orchestrate supported local-development processes for generated projects.

## Test

```bash
stellarforge test
```

The command should preserve meaningful test failures and exit codes.

## Deploy to Testnet

```bash
stellarforge deploy
```

The v1 MVP targets Stellar Testnet. Mainnet deployment automation is explicitly outside the MVP.

## Current Status

Use the repository README and ROADMAP as the source of truth for which commands are available versus planned.
