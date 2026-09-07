# Dependency Policy

Dependencies increase capability and supply-chain risk. Add one only when its value is clear and the functionality should not reasonably be implemented with existing platform capabilities.

## Requirements

Before adding a dependency, consider:

- maintenance activity and ownership;
- security history and known vulnerabilities;
- transitive dependency footprint;
- package install/lifecycle scripts;
- license compatibility;
- bundle/runtime cost;
- whether the dependency is needed at runtime or only for development;
- whether Node.js built-ins or existing dependencies are sufficient.

## Rules

- Keep runtime dependencies minimal.
- Commit `package-lock.json` and use `npm ci` in CI.
- Do not introduce preinstall/postinstall scripts without explicit justification and review.
- Avoid abandoned or typosquatting-risk packages.
- Dependency changes must pass automated review/scanning once those workflows are enabled.
- Security-sensitive or high-impact dependencies require maintainer review.

## Updates

Prefer small, reviewable dependency updates. Major upgrades should document compatibility impact and include relevant tests.
