---
'@diginodes/stellarforge-cli': patch
---

Harden project configuration loading so reads stay on an inspected regular file inside the project root, document the portable non-secret permission policy, and add deterministic coverage for unreadable files and symlink boundaries.
