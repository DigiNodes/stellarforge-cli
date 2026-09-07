# Static Quality Checks

StellarForge CLI uses three complementary static quality gates before tests and build validation.

## TypeScript

```bash
npm run typecheck
```

The project uses strict TypeScript settings, including unchecked-index access, exact optional properties, unused-symbol checks, implicit-return checks, and NodeNext module semantics.

TypeScript owns compile-time type correctness. Do not weaken project-wide strictness to work around a local implementation issue.

## ESLint

```bash
npm run lint
```

ESLint uses the repository flat configuration and TypeScript-aware project service for source and test files. It enforces the recommended JavaScript/TypeScript rules plus repository-specific restrictions such as consistent type imports and prohibition of explicit `any`.

ESLint owns semantic/static code-quality rules. Formatting-only concerns should remain with Prettier rather than being duplicated as lint rules.

## Prettier

```bash
npm run format:check
```

Use the repository Prettier configuration as the formatting source of truth. To format the supported implementation/config surface locally, run:

```bash
npm run format
```

Generated output, coverage output, and installed dependencies are excluded from formatting checks through the repository ignore policy.

## Enforcement Expectations

Before opening a pull request, all three checks must pass:

```bash
npm run typecheck
npm run lint
npm run format:check
```

The test suite contains generated negative fixtures that deliberately violate each tool's rules. These tests execute the locally installed, lockfile-pinned tool binaries and verify that invalid input is rejected. They do not use `npx` or fetch tooling from the network.

Keep responsibilities separate:

- TypeScript: type correctness and compiler-level constraints;
- ESLint: semantic/static code-quality rules;
- Prettier: deterministic formatting.

Avoid adding duplicate ESLint formatting rules that conflict with Prettier.
