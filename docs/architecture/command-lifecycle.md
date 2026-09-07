# Command Lifecycle

Every StellarForge CLI command should follow the same high-level lifecycle so behavior remains predictable and testable.

## Lifecycle

```text
Invocation
  ↓
Parse Arguments
  ↓
Validate Input
  ↓
Load Required Configuration
  ↓
Perform Preconditions / Diagnostics
  ↓
Execute Command Service
  ↓
Render Result / Error
  ↓
Return Exit Code
```

## Rules

- Parsing should not perform business logic.
- Validation happens before filesystem, process, network, or deployment side effects.
- Configuration loading should request only what the command needs.
- Preconditions should fail early with actionable messages.
- Side effects should be isolated behind focused services/modules.
- Errors should be converted to stable user-facing output and deterministic exit codes.
- Commands must not log secrets or dump raw environment/config objects.
- Cancellation and partial-failure cleanup must be considered for long-running/process-oriented commands.

## Side-Effecting Commands

`new`, `dev`, `test`, and `deploy` require special care around filesystem/process behavior. Where practical, operations should validate before mutating state and clean up or clearly report partial state on failure.

## Testing

Command tests should cover successful execution, invalid input, expected failures, exit codes, stdout/stderr behavior, and side-effect boundaries. Live-network tests should be separated from unit tests and kept optional unless explicitly required by the issue.
