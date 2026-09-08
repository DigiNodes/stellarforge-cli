# Changesets Contributor Workflow

StellarForge CLI uses Changesets to record release intent close to the pull request that introduces a user-visible package change. The project is still pre-release and the npm package remains private, so this workflow currently supports local version and changelog generation only. It does not publish packages or create release tags.

## When a Changeset Is Required

Add a changeset when a pull request changes shipped or user-visible behavior, including:

- user-facing bug fixes;
- new commands, flags, or options;
- changes to existing command behavior;
- shipped template changes;
- intentional breaking changes;
- meaningful user-facing performance improvements.

A changeset is normally not required for documentation-only work, tests that do not alter shipped behavior, internal CI maintenance, repository templates, or non-shipping refactors. Maintainers may still request one when release communication is useful.

These rules follow `docs/adr/ADR-0003-release-and-versioning-strategy.md`.

## Create a Changeset

From the repository root, run:

```bash
npm run changeset
```

The Changesets prompt asks which package is affected, the release impact, and for a concise summary. The command creates a Markdown file under `.changeset/`.

Review the generated file before committing it. A typical file for this repository looks like:

```markdown
---
"@stellarforge/cli": patch
---

Describe the user-visible change clearly.
```

Do not include secrets, private keys, tokens, unpublished vulnerability details, or unrelated implementation notes in a changeset summary.

## Release Impact

Use the release level defined by ADR-0003:

- `patch` for backward-compatible bug fixes and compatible shipped improvements;
- `minor` for backward-compatible new commands, flags, templates, or capabilities;
- `major` for incompatible changes after the stable v1.0 contract exists.

Before v1.0, intentional breaking changes may use a minor release, but they must still be clearly identified as breaking in release communication.

## Inspect Pending Changesets

Run:

```bash
npm run changeset:status
```

This reports pending release intent without publishing anything.

## Generate Versions and Changelog Locally

Maintainers can test the version/changelog result with:

```bash
npm run changeset:version
```

This command consumes pending changeset files and updates package versions/changelog content in the working tree. Review the resulting diff before committing release metadata.

For ordinary feature pull requests, contributors should normally commit the changeset file itself rather than committing generated release-version changes.

## Private Package Behavior

`@stellarforge/cli` is currently marked `private: true`. The Changesets configuration therefore explicitly enables private-package versioning while keeping private-package tags disabled:

```json
"privatePackages": {
  "version": true,
  "tag": false
}
```

This allows us to prove version/changelog generation during development without enabling package publication or release tagging.

## Publishing Is Out of Scope

The following are intentionally not part of the current Changesets integration:

- `changeset publish`;
- npm publication;
- npm credentials or tokens;
- Git tags;
- GitHub Releases;
- release-publishing GitHub Actions.

Protected publication automation will be implemented separately only after package identity, security gates, trusted publishing, and release-readiness requirements are satisfied.
