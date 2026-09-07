# Exit Code Policy

StellarForge CLI uses predictable process exit codes so humans, scripts, and CI can distinguish success from specific failure categories.

## Stable Baseline

| Exit code | Category | Meaning |
|---:|---|---|
| `0` | Success | The requested CLI operation completed successfully. |
| `1` | Unexpected failure | An unclassified exception reached the top-level CLI boundary. |
| `2` | Validation / usage failure | User input, command syntax, options, arguments, or other validated input was invalid. |
| `3` | Subprocess failure | A required external process or tool failed. |
| `4` | Internal failure | StellarForge detected a known internal failure condition that should not expose implementation details to the user. |

These values are part of the CLI contract and should not be changed casually. New stable categories require deliberate review and documentation.

## Rendering Rules

- user-facing failures are written to stderr;
- successful informational output remains independent of numeric exit status;
- validation and subprocess errors may expose only an explicitly safe user-facing message;
- internal failures render a generic message while preserving the underlying cause internally;
- unexpected exceptions render a generic message and do not expose the original error message or stack trace by default;
- Commander parser failures are mapped to exit code `2` without duplicating Commander's existing usage/error rendering;
- `--help` and `--version` remain successful exits with code `0`.

## Command Requirements

- commands must not return `0` when required work failed;
- failed subprocesses must not be silently converted to success;
- test failures must propagate meaningful failure status;
- deployment failures must never return success;
- interrupted/cancelled-operation semantics will be documented when cancellation support is implemented;
- future command-specific errors should use the centralized CLI error boundary instead of assigning ad hoc process exit codes.

The source-level constants in the CLI error module and this reference must remain aligned.
