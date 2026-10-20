---
'@diginodes/stellarforge-cli': patch
---

Add generator text/binary classification fixtures (SW-034). The new `generator-text-binary-classification.test.ts` suite proves that text files permit only the allowlisted `{{projectName}}` and `{{templateId}}` substitutions, binary files (containing at least one NUL byte) are copied byte-for-byte with no token expansion, classification is purely byte-level and deterministic across repeated calls and independent template trees, and mixed templates process text and binary siblings at every nesting depth without cross-contamination.
