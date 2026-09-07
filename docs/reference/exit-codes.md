# Exit Code Policy

StellarForge CLI should use predictable process exit codes so humans, scripts, and CI can distinguish success from failure.

## Baseline

- `0` — successful command completion.
- non-zero — command failure.

The detailed stable taxonomy will be finalized alongside centralized error handling. Until then, commands must not return success when required work failed.

## Rules

- validation failures return non-zero;
- unknown commands/options return non-zero;
- failed subprocesses must not be silently converted to success;
- interrupted/cancelled operations should return non-zero unless explicitly documented otherwise;
- test failures must propagate meaningful failure status;
- deployment failures must never return success;
- user-facing output belongs on stdout or stderr according to the output policy, independently of the numeric exit code.

When dedicated error categories are introduced, this document becomes the public source of truth for their numeric mapping.
