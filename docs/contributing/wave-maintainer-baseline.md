# Stellar Wave Maintainer Baseline

**Frozen:** 2026-09-18  
**Status:** contributor intake baseline

This document records the maintainer handoff from MVP implementation to contributor-led stabilization.

## Current product baseline

The implemented v1 stabilization surface is frozen by `wave-architecture.md`:

- `stellarforge new`
- `stellarforge doctor`
- `stellarforge dev`
- `stellarforge test`
- `stellarforge deploy` (Testnet only)
- global help/version
- bundled templates: `basic-app`, `full-stack`, `smart-contract`, `api-service`

The MVP smoke workflow and protected release automation are already implemented. CLI-037 and CLI-038 are closed. The subsequent v1 readiness and installation reconciliation work is also merged.

## Contributor backlog baseline

The contributor plan contains exactly 120 IDs, `SW-001` through `SW-120`. The canonical dependency graph is `wave-backlog-plan.md`.

Maintainer policy:

- contributor work extends the frozen architecture; it does not casually redesign it;
- protected surfaces require explicit issue scope and maintainer review;
- dependencies are represented by SW IDs in issue bodies;
- only issues carrying `intake: ready` are open for new claims;
- `intake: queued` issues remain visible backlog but should not be claimed yet;
- `blocked` means at least one declared SW dependency is still open;
- automation maintains a bounded ready pool rather than exposing the entire backlog at once.

## First contribution batch

The initial ready batch is:

`SW-001`–`SW-014`, `SW-019`, and `SW-020`.

`SW-015`–`SW-018` are reserve template-documentation issues. Later issues are promoted as capacity opens and their dependencies are satisfied.

## Maintainer-owned work

Maintainers retain responsibility for:

- architecture and security decisions;
- protected/core surfaces;
- issue dependency and conflict sequencing;
- repository/ruleset administration;
- release credentials/environments and npm Trusted Publishing;
- vulnerability handling;
- final merge decisions;
- backlog conformance audits.

## External repository administration

Some controls cannot be established by repository files alone and must be verified in GitHub settings:

- branch/ruleset enforcement;
- required status checks and CODEOWNERS enforcement;
- Dependency Graph / Dependency Review availability;
- release environment protection;
- npm Trusted Publishing;
- repository milestones.

Repository labels are the authoritative automation state even when a GitHub milestone is also used.

## Automation state model

Automation uses these labels:

- `intake: ready` — contributor may claim;
- `intake: queued` — visible backlog, not currently open for claim;
- `blocked` — declared dependency still open;
- `status: in progress` — assigned contributor has claimed the issue;
- `status: stale` — inactivity warning has been issued.

The automation keeps at most 20 unassigned ready Wave issues at a time. Dependency-free queued issues are promoted in SW-ID order as capacity becomes available.
