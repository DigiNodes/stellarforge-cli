# Changesets

StellarForge CLI uses Changesets to record release impact close to the pull request that introduces it.

## When to Add One

Add a changeset when your PR changes the published CLI or user-visible behavior, such as a bug fix, command/flag, shipped template, breaking change, or meaningful user-facing performance improvement.

Documentation-only changes, tests without shipped behavior changes, repository templates, and internal CI maintenance normally do not require a changeset.

Once the package foundation exists, contributors will create changesets with the project's configured Changesets CLI command and select the appropriate release impact.

Do not manually invent a package name before the npm/package identity is finalized.
