---
'@diginodes/stellarforge-cli': patch
---

Add `assertPackageMetadata` and `readPackageJson` to `tests/helpers` (SW-039). The new reusable conformance helper centralises all generated-project package.json assertions — name, scripts, engines.node, absence of dependencies, and absence of embedded secrets — so template tests no longer duplicate that boilerplate. Adopted in `basic-app-package-metadata.test.ts`.
